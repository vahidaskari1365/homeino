import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Loader2, ArrowRight, Sparkles, LogOut, Plus, Pencil, Trash2,
  Package, ImageIcon, Save,
} from "lucide-react";

interface Category { id: string; name: string; slug: string; }
interface Profile {
  id: string; brand_name: string; contact_name: string | null;
  phone: string | null; city: string | null; address: string | null;
  description: string | null; website: string | null;
}
interface Product {
  id: string; name: string; description: string | null;
  price: number | null; stock: number; image_url: string | null;
  is_active: boolean; category_id: string | null;
}

const profileSchema = z.object({
  brand_name: z.string().trim().min(1, "نام برند الزامی است").max(120),
  contact_name: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  website: z.string().trim().max(255).optional().or(z.literal("")),
});

const productSchema = z.object({
  name: z.string().trim().min(1, "نام محصول الزامی است").max(150),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  price: z.coerce.number().min(0).max(999999999).optional(),
  stock: z.coerce.number().int().min(0).max(999999),
  category_id: z.string().nullable().optional(),
  is_active: z.boolean(),
});

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // product dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pPrice, setPPrice] = useState<string>("");
  const [pStock, setPStock] = useState<string>("0");
  const [pCat, setPCat] = useState<string>("none");
  const [pActive, setPActive] = useState(true);
  const [pImageFile, setPImageFile] = useState<File | null>(null);
  const [pImageUrl, setPImageUrl] = useState<string>("");

  // ---- bootstrap ----
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth", { replace: true }); return; }
      if (!mounted) return;
      setUserId(session.user.id);
      await loadAll(session.user.id);
      setLoading(false);
    };
    init();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) navigate("/auth", { replace: true });
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async (uid: string) => {
    const [{ data: prof }, { data: cats }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("producer_categories").select("id, name, slug").order("name"),
    ]);
    if (cats) setCategories(cats);
    if (prof) {
      setProfile(prof as Profile);
      const [{ data: pc }, { data: prods }] = await Promise.all([
        supabase.from("profile_categories").select("category_id").eq("profile_id", prof.id),
        supabase.from("products").select("*").eq("profile_id", prof.id).order("created_at", { ascending: false }),
      ]);
      if (pc) setSelectedCats(pc.map((r) => r.category_id));
      if (prods) setProducts(prods as Product[]);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // ---- profile save ----
  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const result = profileSchema.safeParse(profile);
    if (!result.success) {
      toast({ title: "خطا", description: result.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        brand_name: profile.brand_name,
        contact_name: profile.contact_name || null,
        phone: profile.phone || null,
        city: profile.city || null,
        address: profile.address || null,
        description: profile.description || null,
        website: profile.website || null,
      })
      .eq("id", profile.id);

    // sync categories: delete missing, add new
    if (!error) {
      const { data: current } = await supabase
        .from("profile_categories").select("category_id").eq("profile_id", profile.id);
      const currentIds = new Set((current ?? []).map((r) => r.category_id));
      const desiredIds = new Set(selectedCats);
      const toAdd = selectedCats.filter((id) => !currentIds.has(id));
      const toRemove = [...currentIds].filter((id) => !desiredIds.has(id));
      if (toAdd.length) {
        await supabase.from("profile_categories").insert(
          toAdd.map((category_id) => ({ profile_id: profile.id, category_id }))
        );
      }
      if (toRemove.length) {
        await supabase.from("profile_categories").delete()
          .eq("profile_id", profile.id).in("category_id", toRemove);
      }
    }
    setSaving(false);
    if (error) toast({ title: "خطا در ذخیره", description: error.message, variant: "destructive" });
    else toast({ title: "ذخیره شد", description: "اطلاعات پروفایل به‌روزرسانی شد" });
  };

  // ---- product helpers ----
  const resetProductForm = () => {
    setEditing(null); setPName(""); setPDesc(""); setPPrice("");
    setPStock("0"); setPCat("none"); setPActive(true);
    setPImageFile(null); setPImageUrl("");
  };

  const openNewProduct = () => { resetProductForm(); setDialogOpen(true); };
  const openEditProduct = (p: Product) => {
    setEditing(p);
    setPName(p.name); setPDesc(p.description ?? "");
    setPPrice(p.price?.toString() ?? ""); setPStock(p.stock.toString());
    setPCat(p.category_id ?? "none"); setPActive(p.is_active);
    setPImageUrl(p.image_url ?? ""); setPImageFile(null);
    setDialogOpen(true);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!userId) return null;
    const ext = file.name.split(".").pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) {
      toast({ title: "خطا در آپلود", description: error.message, variant: "destructive" });
      return null;
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const parsed = productSchema.safeParse({
      name: pName, description: pDesc, price: pPrice || undefined,
      stock: pStock, category_id: pCat === "none" ? null : pCat, is_active: pActive,
    });
    if (!parsed.success) {
      toast({ title: "خطا", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSaving(true);
    let imageUrl = pImageUrl || null;
    if (pImageFile) {
      const uploaded = await uploadImage(pImageFile);
      if (uploaded) imageUrl = uploaded;
    }

    const payload = {
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price ?? null,
      stock: parsed.data.stock,
      category_id: parsed.data.category_id ?? null,
      is_active: parsed.data.is_active,
      image_url: imageUrl,
      profile_id: profile.id,
    };

    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);

    setSaving(false);
    if (error) {
      toast({ title: "خطا", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "محصول ویرایش شد" : "محصول اضافه شد" });
    setDialogOpen(false);
    resetProductForm();
    await loadAll(userId!);
  };

  const deleteProduct = async (p: Product) => {
    if (!confirm(`حذف محصول «${p.name}»؟`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) toast({ title: "خطا", description: error.message, variant: "destructive" });
    else { toast({ title: "حذف شد" }); setProducts((prev) => prev.filter((x) => x.id !== p.id)); }
  };

  const updateProfileField = useCallback(<K extends keyof Profile>(key: K, val: Profile[K]) => {
    setProfile((prev) => prev ? { ...prev, [key]: val } : prev);
  }, []);

  const toggleCat = (id: string) => {
    setSelectedCats((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-gold" size={32} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md p-8 text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">پروفایل تولیدکننده یافت نشد</h2>
          <p className="text-muted-foreground text-sm mb-6">
            این داشبورد مخصوص حساب‌های تولیدکننده است. لطفاً با حساب تولیدکننده ثبت‌نام کنید.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={handleSignOut}>خروج</Button>
            <Link to="/"><Button>صفحه اصلی</Button></Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-brand/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-gold text-sm mb-2">
              <ArrowRight size={16} /> بازگشت به خانه
            </Link>
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-4 py-1.5 mb-2">
              <Sparkles size={14} className="text-gold" />
              <span className="text-gold text-xs font-medium">داشبورد تولیدکننده</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{profile.brand_name}</h1>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="gap-2 self-start">
            <LogOut size={16} /> خروج
          </Button>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid grid-cols-2 max-w-md mb-6">
            <TabsTrigger value="profile">پروفایل و دسته‌بندی‌ها</TabsTrigger>
            <TabsTrigger value="products">محصولات ({products.length})</TabsTrigger>
          </TabsList>

          {/* PROFILE TAB */}
          <TabsContent value="profile">
            <Card className="p-6 md:p-8 shadow-luxury bg-card border-border">
              <form onSubmit={saveProfile} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>نام برند <span className="text-destructive">*</span></Label>
                    <Input value={profile.brand_name}
                      onChange={(e) => updateProfileField("brand_name", e.target.value)} maxLength={120} />
                  </div>
                  <div className="space-y-2">
                    <Label>نام مسئول</Label>
                    <Input value={profile.contact_name ?? ""}
                      onChange={(e) => updateProfileField("contact_name", e.target.value)} maxLength={120} />
                  </div>
                  <div className="space-y-2">
                    <Label>شماره تماس</Label>
                    <Input dir="ltr" value={profile.phone ?? ""}
                      onChange={(e) => updateProfileField("phone", e.target.value)} maxLength={30} />
                  </div>
                  <div className="space-y-2">
                    <Label>شهر</Label>
                    <Input value={profile.city ?? ""}
                      onChange={(e) => updateProfileField("city", e.target.value)} maxLength={80} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>آدرس</Label>
                    <Input value={profile.address ?? ""}
                      onChange={(e) => updateProfileField("address", e.target.value)} maxLength={300} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>وب‌سایت</Label>
                    <Input dir="ltr" placeholder="https://" value={profile.website ?? ""}
                      onChange={(e) => updateProfileField("website", e.target.value)} maxLength={255} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>درباره برند</Label>
                    <Textarea rows={4} value={profile.description ?? ""}
                      onChange={(e) => updateProfileField("description", e.target.value)} maxLength={1000} />
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-border">
                  <Label>دسته‌های فعالیت</Label>
                  <p className="text-xs text-muted-foreground">می‌توانید چند دسته انتخاب کنید</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto p-3 rounded-lg border border-border bg-background">
                    {categories.map((cat) => {
                      const checked = selectedCats.includes(cat.id);
                      return (
                        <label key={cat.id}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-sm ${
                            checked ? "bg-gold/15 border border-gold/40 text-foreground"
                                    : "border border-transparent hover:bg-accent text-muted-foreground"
                          }`}>
                          <Checkbox checked={checked} onCheckedChange={() => toggleCat(cat.id)} />
                          <span>{cat.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <Button type="submit" disabled={saving}
                  className="gradient-gold text-primary-foreground hover:opacity-90 gap-2">
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  ذخیره تغییرات
                </Button>
              </form>
            </Card>
          </TabsContent>

          {/* PRODUCTS TAB */}
          <TabsContent value="products">
            <Card className="p-6 md:p-8 shadow-luxury bg-card border-border">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Package size={20} className="text-gold" /> محصولات شما
                </h2>
                <Button onClick={openNewProduct}
                  className="gradient-gold text-primary-foreground hover:opacity-90 gap-2">
                  <Plus size={18} /> افزودن محصول
                </Button>
              </div>

              {products.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border rounded-xl">
                  <Package size={40} className="mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">هنوز محصولی اضافه نکرده‌اید</p>
                  <Button onClick={openNewProduct} variant="outline" className="gap-2">
                    <Plus size={16} /> افزودن اولین محصول
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((p) => (
                    <Card key={p.id} className="overflow-hidden border-border bg-background hover:shadow-luxury transition-shadow">
                      <div className="aspect-square bg-muted relative overflow-hidden">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ImageIcon size={36} />
                          </div>
                        )}
                        {!p.is_active && (
                          <span className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded">
                            غیرفعال
                          </span>
                        )}
                      </div>
                      <div className="p-4 space-y-2">
                        <h3 className="font-bold text-foreground line-clamp-1">{p.name}</h3>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gold font-bold">
                            {p.price ? `${p.price.toLocaleString("fa-IR")} تومان` : "—"}
                          </span>
                          <span className="text-muted-foreground text-xs">موجودی: {p.stock}</span>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => openEditProduct(p)}>
                            <Pencil size={14} /> ویرایش
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => deleteProduct(p)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetProductForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "ویرایش محصول" : "افزودن محصول جدید"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveProduct} className="space-y-4">
            <div className="space-y-2">
              <Label>نام محصول <span className="text-destructive">*</span></Label>
              <Input value={pName} onChange={(e) => setPName(e.target.value)} maxLength={150} required />
            </div>
            <div className="space-y-2">
              <Label>توضیحات</Label>
              <Textarea rows={3} value={pDesc} onChange={(e) => setPDesc(e.target.value)} maxLength={2000} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>قیمت (تومان)</Label>
                <Input type="number" min="0" dir="ltr" value={pPrice} onChange={(e) => setPPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>موجودی</Label>
                <Input type="number" min="0" dir="ltr" value={pStock} onChange={(e) => setPStock(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>دسته‌بندی</Label>
              <Select value={pCat} onValueChange={setPCat}>
                <SelectTrigger><SelectValue placeholder="انتخاب دسته" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون دسته</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>تصویر محصول</Label>
              {pImageUrl && !pImageFile && (
                <img src={pImageUrl} alt="" className="w-24 h-24 object-cover rounded-lg border border-border" />
              )}
              <Input type="file" accept="image/*"
                onChange={(e) => setPImageFile(e.target.files?.[0] ?? null)} />
              {pImageFile && <p className="text-xs text-muted-foreground">{pImageFile.name}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="active" checked={pActive} onCheckedChange={(v) => setPActive(v === true)} />
              <Label htmlFor="active" className="cursor-pointer">محصول فعال (در فروشگاه نمایش داده شود)</Label>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={saving} className="gradient-gold text-primary-foreground hover:opacity-90 gap-2">
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                ذخیره
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
