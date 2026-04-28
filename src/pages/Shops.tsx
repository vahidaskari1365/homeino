import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Phone, Globe, Package, Store } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

type Category = { id: string; name: string; slug: string };

type Profile = {
  id: string;
  brand_name: string;
  description: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  contact_name: string | null;
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
  profiles: { brand_name: string; city: string | null } | null;
};

const ALL = "all";

const Shops = () => {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [city, setCity] = useState<string>(ALL);
  const [category, setCategory] = useState<string>(ALL);
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.title = "فروشگاه‌ها و تولیدکنندگان | خانه‌زیبا";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "لیست تولیدکنندگان و محصولات با فیلتر شهر و دسته فعالیت");

    const load = async () => {
      setLoading(true);
      const [cats, profs, prods] = await Promise.all([
        supabase.from("producer_categories").select("id, name, slug").order("name"),
        supabase
          .from("profiles")
          .select("id, brand_name, description, city, phone, website, contact_name, profile_categories(category_id)")
          .order("brand_name"),
        supabase
          .from("products")
          .select("id, name, description, price, image_url, is_active, category_id, profile_id, profiles(brand_name, city)")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
      ]);
      setCategories((cats.data as Category[]) ?? []);
      setProfiles((profs.data as unknown as Profile[]) ?? []);
      setProducts((prods.data as unknown as Product[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const cities = useMemo(() => {
    const s = new Set<string>();
    profiles.forEach((p) => p.city && s.add(p.city));
    products.forEach((p) => p.profiles?.city && s.add(p.profiles.city));
    return Array.from(s).sort();
  }, [profiles, products]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      if (city !== ALL && p.city !== city) return false;
      if (category !== ALL && !p.profile_categories.some((c) => c.category_id === category)) return false;
      if (search && !p.brand_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [profiles, city, category, search]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (city !== ALL && p.profiles?.city !== city) return false;
      if (category !== ALL && p.category_id !== category) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, city, category, search]);

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <main className="container mx-auto px-6 pt-28 pb-16">
        <header className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-display text-gold font-bold mb-3">فروشگاه‌ها و تولیدکنندگان</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            برندها و محصولات اصیل ایرانی را بر اساس شهر و دسته فعالیت کشف کنید.
          </p>
        </header>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-4 rounded-lg border border-border bg-card">
          <Input
            placeholder="جستجو بر اساس نام..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger><SelectValue placeholder="شهر" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>همه شهرها</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="دسته فعالیت" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>همه دسته‌ها</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="producers" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="producers" className="gap-2">
              <Store size={16} /> تولیدکنندگان ({filteredProfiles.length})
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Package size={16} /> محصولات ({filteredProducts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="producers">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}
              </div>
            ) : filteredProfiles.length === 0 ? (
              <p className="text-center text-muted-foreground py-16">هیچ تولیدکننده‌ای یافت نشد.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProfiles.map((p) => (
                  <Link to={`/shops/${p.id}`} key={p.id} className="block">
                    <Card className="hover:border-gold/50 transition-colors h-full">
                      <CardHeader>
                        <CardTitle className="text-xl text-gold">{p.brand_name}</CardTitle>
                        {p.description && (
                          <CardDescription className="line-clamp-2">{p.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-1.5">
                          {p.profile_categories.map((pc) => {
                            const name = categoryName(pc.category_id);
                            return name ? <Badge key={pc.category_id} variant="secondary">{name}</Badge> : null;
                          })}
                        </div>
                        <div className="space-y-1.5 text-sm text-muted-foreground">
                          {p.city && <div className="flex items-center gap-2"><MapPin size={14} />{p.city}</div>}
                          {p.phone && <div className="flex items-center gap-2"><Phone size={14} />{p.phone}</div>}
                          {p.website && (
                            <div className="flex items-center gap-2"><Globe size={14} />{p.website}</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="products">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-72" />)}
              </div>
            ) : filteredProducts.length === 0 ? (
              <p className="text-center text-muted-foreground py-16">هیچ محصولی یافت نشد.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredProducts.map((p) => (
                  <Link to={`/shops/${p.profile_id}`} key={p.id} className="block">
                    <Card className="overflow-hidden hover:border-gold/50 transition-colors h-full">
                      <div className="aspect-square bg-muted overflow-hidden">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} loading="lazy"
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Package size={40} />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4 space-y-2">
                        <h3 className="font-semibold line-clamp-1">{p.name}</h3>
                        <p className="text-xs text-muted-foreground">{p.profiles?.brand_name}</p>
                        {p.price && (
                          <p className="text-gold font-bold">
                            {new Intl.NumberFormat("fa-IR").format(p.price)} تومان
                          </p>
                        )}
                        {p.profiles?.city && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin size={12} />{p.profiles.city}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Shops;
