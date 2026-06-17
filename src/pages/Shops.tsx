import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Phone, Globe, Package, Store, BadgeCheck, CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { formatPersianDate } from "@/lib/date";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import OptimizedImage from "@/components/OptimizedImage";
import SEO from "@/components/SEO";

type Category = { id: string; name: string; slug: string };

type Profile = {
  id: string;
  brand_name: string;
  description: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  contact_name: string | null;
  contact_published: boolean;
  contact_published_at: string | null;
  profile_categories: { category_id: string }[];
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  is_active: boolean;
  category_id: string | null;
  profile_id: string;
  attributes?: Record<string, unknown> | null;
  profiles: { brand_name: string; city: string | null } | null;
};

const ALL = "all";
const PAGE_SIZE = 12;

const Shops = () => {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [city, setCity] = useState<string>(ALL);
  const [category, setCategory] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("producers");

  // Advanced filters state for products
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [color, setColor] = useState<string>(ALL);
  const [material, setMaterial] = useState<string>(ALL);
  
  // Pagination state
  const [profilePage, setProfilePage] = useState(0);
  const [productPage, setProductPage] = useState(0);
  const [totalProfiles, setTotalProfiles] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    const loadCategories = async () => {
      const { data } = await supabase.from("producer_categories").select("id, name, slug").order("name");
      setCategories((data as Category[]) ?? []);
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      const fromP = profilePage * PAGE_SIZE;
      const toP = fromP + PAGE_SIZE - 1;
      
      const fromPr = productPage * PAGE_SIZE;
      const toPr = fromPr + PAGE_SIZE - 1;

      let profileQuery = supabase
        .from("public_profiles")
        .select("id, brand_name, description, city, phone, website, contact_name, contact_published, contact_published_at, profile_categories(category_id)", { count: 'exact' });

      if (verifiedOnly) profileQuery = profileQuery.eq("contact_published", true);
      if (city !== ALL) profileQuery = profileQuery.eq("city", city);
      if (search) profileQuery = profileQuery.ilike("brand_name", `%${search}%`);

      const { data: profs, count: profCount } = await profileQuery
        .order("brand_name")
        .range(fromP, toP);

      let productQuery = supabase
        .from("products")
        .select("id, name, description, price, image_url, is_active, category_id, profile_id, attributes, profiles(brand_name, city)", { count: 'exact' })
        .eq("is_active", true);

      if (city !== ALL) productQuery = productQuery.eq("profiles.city", city);
      if (category !== ALL) productQuery = productQuery.eq("category_id", category);
      if (search) productQuery = productQuery.ilike("name", `%${search}%`);
      if (minPrice !== undefined) productQuery = productQuery.gte("price", minPrice);
      if (maxPrice !== undefined) productQuery = productQuery.lte("price", maxPrice);
      if (color !== ALL) productQuery = productQuery.eq("attributes->>color", color);
      if (material !== ALL) productQuery = productQuery.eq("attributes->>material", material);

      const { data: prods, count: prodCount } = await productQuery
        .order("created_at", { ascending: false })
        .range(fromPr, toPr);

      setProfiles((profs as unknown as Profile[]) ?? []);
      setTotalProfiles(profCount ?? 0);
      setProducts((prods as unknown as Product[]) ?? []);
      setTotalProducts(prodCount ?? 0);
      setLoading(false);
    };

    loadData();
  }, [profilePage, productPage, city, category, search, verifiedOnly, minPrice, maxPrice, color, material]);

  // Cities list for filter - we still might want to fetch all unique cities once
  const [cities, setCities] = useState<string[]>([]);
  useEffect(() => {
    supabase.from("public_profiles").select("city").not("city", "is", null).then(({ data }) => {
      if (data) {
        const uniqueCities = Array.from(new Set(data.map(d => d.city))).sort() as string[];
        setCities(uniqueCities);
      }
    });
  }, []);

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name;

  const totalProfilePages = Math.ceil(totalProfiles / PAGE_SIZE);
  const totalProductPages = Math.ceil(totalProducts / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SEO 
        title="فروشگاه‌ها و تولیدکنندگان" 
        description="لیست تولیدکنندگان و محصولات با فیلتر شهر و دسته فعالیت. خرید مستقیم از برترین برندهای دکوراسیون."
      />
      <Navbar />
      <main className="container mx-auto px-6 pt-28 pb-16">
        <header className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-display text-gold font-bold mb-3">فروشگاه‌ها و تولیدکنندگان</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            برندها و محصولات اصیل ایرانی را بر اساس شهر و دسته فعالیت کشف کنید.
          </p>
        </header>

        {/* Filters */}
        <div className="mb-8 p-4 rounded-lg border border-border bg-card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="جستجو بر اساس نام..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setProfilePage(0); setProductPage(0); }}
            />
            <Select value={city} onValueChange={(v) => { setCity(v); setProfilePage(0); setProductPage(0); }}>
              <SelectTrigger><SelectValue placeholder="شهر" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>همه شهرها</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={(v) => { setCategory(v); setProfilePage(0); setProductPage(0); }}>
              <SelectTrigger><SelectValue placeholder="دسته فعالیت" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>همه دسته‌ها</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Advanced product-specific filters */}
          {activeTab === "products" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-border">
              <div className="flex gap-2 items-center md:col-span-2">
                <Input
                  type="number"
                  placeholder="حداقل قیمت (تومان)"
                  value={minPrice ?? ""}
                  onChange={(e) => { setMinPrice(e.target.value ? Number(e.target.value) : undefined); setProductPage(0); }}
                  className="text-xs"
                />
                <span className="text-muted-foreground text-xs shrink-0">تا</span>
                <Input
                  type="number"
                  placeholder="حداکثر قیمت (تومان)"
                  value={maxPrice ?? ""}
                  onChange={(e) => { setMaxPrice(e.target.value ? Number(e.target.value) : undefined); setProductPage(0); }}
                  className="text-xs"
                />
              </div>
              <Select value={color} onValueChange={(v) => { setColor(v); setProductPage(0); }}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="رنگ" /></SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value={ALL}>همه رنگ‌ها</SelectItem>
                  <SelectItem value="سفید">سفید</SelectItem>
                  <SelectItem value="مشکی">مشکی</SelectItem>
                  <SelectItem value="قهوه‌ای">قهوه‌ای</SelectItem>
                  <SelectItem value="کرم">کرم</SelectItem>
                  <SelectItem value="خاکستری">خاکستری</SelectItem>
                  <SelectItem value="طلایی">طلایی</SelectItem>
                </SelectContent>
              </Select>
              <Select value={material} onValueChange={(v) => { setMaterial(v); setProductPage(0); }}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="جنس / مواد" /></SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value={ALL}>همه جنس‌ها</SelectItem>
                  <SelectItem value="چوب">چوب</SelectItem>
                  <SelectItem value="فلز">فلز</SelectItem>
                  <SelectItem value="پارچه">پارچه</SelectItem>
                  <SelectItem value="چرم">چرم</SelectItem>
                  <SelectItem value="شیشه">شیشه</SelectItem>
                  <SelectItem value="سنگ">سنگ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <Switch id="verified-only" checked={verifiedOnly} onCheckedChange={(v) => { setVerifiedOnly(v); setProfilePage(0); setProductPage(0); }} />
              <Label htmlFor="verified-only" className="cursor-pointer flex items-center gap-1.5 text-xs">
                <BadgeCheck size={14} className="text-emerald-brand" />
                فقط تولیدکنندگان با اطلاعات تماس تأیید‌شده
              </Label>
            </div>
            {(city !== ALL || category !== ALL || search || verifiedOnly || minPrice !== undefined || maxPrice !== undefined || color !== ALL || material !== ALL) && (
              <button
                onClick={() => { 
                  setCity(ALL); 
                  setCategory(ALL); 
                  setSearch(""); 
                  setVerifiedOnly(false); 
                  setMinPrice(undefined);
                  setMaxPrice(undefined);
                  setColor(ALL);
                  setMaterial(ALL);
                  setProfilePage(0); 
                  setProductPage(0); 
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                پاک کردن فیلترها
              </button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="producers" className="gap-2">
              <Store size={16} /> تولیدکنندگان ({totalProfiles})
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Package size={16} /> محصولات ({totalProducts})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="producers">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}
              </div>
            ) : profiles.length === 0 ? (
              <p className="text-center text-muted-foreground py-16">هیچ تولیدکننده‌ای یافت نشد.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {profiles.map((p) => (
                    <Link to={`/shops/${p.id}`} key={p.id} className="block">
                      <Card className="hover:border-gold/50 transition-colors h-full">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-xl text-gold">{p.brand_name}</CardTitle>
                            {p.contact_published && (
                              <div className="flex flex-col items-end gap-0.5 shrink-0">
                                <span title="اطلاعات تأیید شده"
                                  className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-brand/15 text-emerald-brand border border-emerald-brand/30">
                                  <BadgeCheck size={12} /> تأیید شده
                                </span>
                                {p.contact_published_at && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <CalendarCheck size={10} /> {formatPersianDate(p.contact_published_at)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {p.description && (
                            <CardDescription className="line-clamp-2">{p.description}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex flex-wrap gap-1.5">
                            {p.profile_categories?.map((pc) => {
                              const name = categoryName(pc.category_id);
                              return name ? <Badge key={pc.category_id} variant="secondary">{name}</Badge> : null;
                            })}
                          </div>
                          {p.contact_published ? (
                            <div className="space-y-1.5 text-sm text-muted-foreground">
                              {p.city && <div className="flex items-center gap-2"><MapPin size={14} />{p.city}</div>}
                              {p.phone && <div className="flex items-center gap-2"><Phone size={14} />{p.phone}</div>}
                              {p.website && (
                                <div className="flex items-center gap-2"><Globe size={14} />{p.website}</div>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">اطلاعات تماس هنوز منتشر نشده</p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
                {totalProfilePages > 1 && (
                  <div className="flex justify-center mt-12 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProfilePage(prev => Math.max(0, prev - 1))}
                      disabled={profilePage === 0}
                    >
                      <ChevronRight size={16} className="ml-1" /> قبلی
                    </Button>
                    <div className="flex items-center px-4 text-sm font-medium">
                      صفحه {profilePage + 1} از {totalProfilePages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProfilePage(prev => Math.min(totalProfilePages - 1, prev + 1))}
                      disabled={profilePage === totalProfilePages - 1}
                    >
                      بعدی <ChevronLeft size={16} className="mr-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="products">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-72" />)}
              </div>
            ) : products.length === 0 ? (
              <p className="text-center text-muted-foreground py-16">هیچ محصولی یافت نشد.</p>
            ) : (
              <>
                <div className="columns-1 sm:columns-2 lg:columns-4 gap-6 [column-fill:_auto] space-y-6">
                  {products.map((p) => (
                    <Link to={`/shops/${p.profile_id}`} key={p.id} className="block break-inside-avoid mb-6">
                      <Card className="overflow-hidden hover:border-gold/50 transition-all duration-300 hover:shadow-lg rounded-2xl h-full bg-card">
                        <div className="relative bg-muted overflow-hidden">
                          {p.image_url ? (
                            <OptimizedImage 
                              src={p.image_url} 
                              alt={p.name}
                              className="w-full h-auto max-h-[350px] object-cover hover:scale-105 transition-transform duration-500" 
                            />
                          ) : (
                            <div className="aspect-[4/3] w-full flex items-center justify-center text-muted-foreground">
                              <Package size={40} />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4 space-y-2">
                          <h3 className="font-bold text-base line-clamp-1">{p.name}</h3>
                          <p className="text-xs text-muted-foreground font-semibold">{p.profiles?.brand_name}</p>
                          <div className="flex items-center justify-between pt-2 border-t border-border/40">
                            {p.price ? (
                              <span className="text-gold font-extrabold text-base">
                                {new Intl.NumberFormat("fa-IR").format(p.price)} تومان
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs font-semibold">استعلام قیمت</span>
                            )}
                            {p.profiles?.city && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin size={12} />{p.profiles.city}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
                {totalProductPages > 1 && (
                  <div className="flex justify-center mt-12 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProductPage(prev => Math.max(0, prev - 1))}
                      disabled={productPage === 0}
                    >
                      <ChevronRight size={16} className="ml-1" /> قبلی
                    </Button>
                    <div className="flex items-center px-4 text-sm font-medium">
                      صفحه {productPage + 1} از {totalProductPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProductPage(prev => Math.min(totalProductPages - 1, prev + 1))}
                      disabled={productPage === totalProductPages - 1}
                    >
                      بعدی <ChevronLeft size={16} className="mr-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Shops;
