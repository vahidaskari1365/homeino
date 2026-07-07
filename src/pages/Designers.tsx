import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Palette, Plus, Star, Trash2, Briefcase } from "lucide-react";

type Designer = {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  specialties: string[] | null;
  hourly_rate: number | null;
  rating: number;
  is_active: boolean;
};

type Portfolio = {
  id: string;
  designer_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  project_type: string | null;
  year: number | null;
  location: string | null;
};

type Consultation = {
  id: string;
  title: string;
  status: string;
  consultation_type: string;
  customer_name: string;
  city: string | null;
  designer_id: string | null;
  created_at: string;
};

const Designers = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [myProfile, setMyProfile] = useState<Designer | null>(null);
  const [myPortfolio, setMyPortfolio] = useState<Portfolio[]>([]);
  const [openProjects, setOpenProjects] = useState<Consultation[]>([]);
  const [selected, setSelected] = useState<Designer | null>(null);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);

  // profile form
  const [pf, setPf] = useState({ display_name: "", bio: "", avatar_url: "", specialties: "", hourly_rate: "" });
  // portfolio form
  const [showPortfolioDialog, setShowPortfolioDialog] = useState(false);
  const [portfolioForm, setPortfolioForm] = useState({ title: "", description: "", image_url: "", project_type: "", year: "", location: "" });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      await loadDesigners();
      if (user) {
        const { data: prof } = await supabase.from("designers").select("*").eq("user_id", user.id).maybeSingle();
        if (prof) {
          setMyProfile(prof as Designer);
          setPf({
            display_name: prof.display_name ?? "",
            bio: prof.bio ?? "",
            avatar_url: prof.avatar_url ?? "",
            specialties: (prof.specialties ?? []).join("، "),
            hourly_rate: prof.hourly_rate?.toString() ?? "",
          });
          await loadMyPortfolio(prof.id);
          await loadOpenProjects();
        }
      }
      setLoading(false);
    })();
  }, []);

  const loadDesigners = async () => {
    const { data } = await supabase.from("designers").select("*").eq("is_active", true).order("rating", { ascending: false });
    setDesigners((data as Designer[]) ?? []);
  };

  const loadMyPortfolio = async (did: string) => {
    const { data } = await supabase.from("designer_portfolio").select("*").eq("designer_id", did).order("created_at", { ascending: false });
    setMyPortfolio((data as Portfolio[]) ?? []);
  };

  const loadOpenProjects = async () => {
    const { data } = await supabase.from("consultations").select("*").is("designer_id", null).eq("status", "pending").order("created_at", { ascending: false });
    setOpenProjects((data as Consultation[]) ?? []);
  };

  const openDesigner = async (d: Designer) => {
    setSelected(d);
    const { data } = await supabase.from("designer_portfolio").select("*").eq("designer_id", d.id).order("created_at", { ascending: false });
    setSelectedPortfolio((data as Portfolio[]) ?? []);
  };

  const saveProfile = async () => {
    if (!userId) { navigate("/auth"); return; }
    if (!pf.display_name.trim()) { toast({ title: "نام نمایشی الزامی است", variant: "destructive" }); return; }
    const payload = {
      user_id: userId,
      display_name: pf.display_name.trim(),
      bio: pf.bio.trim() || null,
      avatar_url: pf.avatar_url.trim() || null,
      specialties: pf.specialties.split(/[،,]/).map((s) => s.trim()).filter(Boolean),
      hourly_rate: pf.hourly_rate ? Number(pf.hourly_rate) : null,
    };
    const { data, error } = myProfile
      ? await supabase.from("designers").update(payload).eq("id", myProfile.id).select().single()
      : await supabase.from("designers").insert(payload).select().single();
    if (error) { toast({ title: "خطا", description: error.message, variant: "destructive" }); return; }
    setMyProfile(data as Designer);
    toast({ title: "ذخیره شد" });
    if (!myProfile) {
      await loadMyPortfolio((data as Designer).id);
      await loadOpenProjects();
    }
    await loadDesigners();
  };

  const addPortfolio = async () => {
    if (!myProfile) return;
    if (!portfolioForm.title.trim()) { toast({ title: "عنوان الزامی است", variant: "destructive" }); return; }
    const { error } = await supabase.from("designer_portfolio").insert({
      designer_id: myProfile.id,
      title: portfolioForm.title.trim(),
      description: portfolioForm.description.trim() || null,
      image_url: portfolioForm.image_url.trim() || null,
      project_type: portfolioForm.project_type.trim() || null,
      year: portfolioForm.year ? Number(portfolioForm.year) : null,
      location: portfolioForm.location.trim() || null,
    });
    if (error) { toast({ title: "خطا", description: error.message, variant: "destructive" }); return; }
    toast({ title: "نمونه کار اضافه شد" });
    setPortfolioForm({ title: "", description: "", image_url: "", project_type: "", year: "", location: "" });
    setShowPortfolioDialog(false);
    await loadMyPortfolio(myProfile.id);
  };

  const deletePortfolio = async (id: string) => {
    const { error } = await supabase.from("designer_portfolio").delete().eq("id", id);
    if (error) { toast({ title: "خطا", description: error.message, variant: "destructive" }); return; }
    if (myProfile) await loadMyPortfolio(myProfile.id);
  };

  const claimProject = async (c: Consultation) => {
    if (!myProfile) return;
    const { error } = await supabase.from("consultations").update({ designer_id: myProfile.id, status: "assigned" }).eq("id", c.id);
    if (error) { toast({ title: "خطا", description: error.message, variant: "destructive" }); return; }
    toast({ title: "پروژه پذیرفته شد", description: "از صفحه مشاوره ادامه دهید" });
    await loadOpenProjects();
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <main className="container mx-auto px-6 pt-28 pb-20">
        <div className="flex items-center gap-3 mb-2">
          <Palette className="text-gold" size={32} />
          <h1 className="text-4xl font-display text-gold font-bold">طراحان داخلی</h1>
        </div>
        <p className="text-muted-foreground mb-8">با طراحان حرفه‌ای آشنا شوید، نمونه کارهایشان را ببینید و پروژه سفارش دهید</p>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold" size={40} /></div>
        ) : (
          <Tabs defaultValue="browse">
            <TabsList>
              <TabsTrigger value="browse">طراحان ({designers.length})</TabsTrigger>
              <TabsTrigger value="panel">پنل طراح</TabsTrigger>
            </TabsList>

            <TabsContent value="browse" className="mt-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {designers.map((d) => (
                  <Card key={d.id} className="hover:border-gold/50 transition cursor-pointer" onClick={() => openDesigner(d)}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        {d.avatar_url ? (
                          <img src={d.avatar_url} alt={d.display_name} className="w-14 h-14 rounded-full object-cover" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-xl">
                            {d.display_name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1">
                          <CardTitle className="text-base">{d.display_name}</CardTitle>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Star size={14} className="text-gold fill-gold" />
                            {Number(d.rating).toFixed(1)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {d.bio && <p className="text-sm text-muted-foreground line-clamp-2">{d.bio}</p>}
                      <div className="flex flex-wrap gap-1">
                        {(d.specialties ?? []).slice(0, 4).map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                      </div>
                      {d.hourly_rate && <div className="text-sm text-gold">از {Number(d.hourly_rate).toLocaleString("en-US")} تومان/ساعت</div>}
                    </CardContent>
                  </Card>
                ))}
                {designers.length === 0 && (
                  <Card className="md:col-span-2 lg:col-span-3"><CardContent className="py-10 text-center text-muted-foreground">هنوز طراحی ثبت نشده است.</CardContent></Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="panel" className="mt-6 space-y-6">
              <Card>
                <CardHeader><CardTitle>پروفایل طراح</CardTitle></CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>نام نمایشی</Label><Input value={pf.display_name} onChange={(e) => setPf({ ...pf, display_name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>تصویر پروفایل (URL)</Label><Input value={pf.avatar_url} onChange={(e) => setPf({ ...pf, avatar_url: e.target.value })} /></div>
                  <div className="space-y-2 md:col-span-2"><Label>درباره من</Label><Textarea value={pf.bio} onChange={(e) => setPf({ ...pf, bio: e.target.value })} rows={3} /></div>
                  <div className="space-y-2"><Label>تخصص‌ها (با ویرگول جدا کنید)</Label><Input value={pf.specialties} onChange={(e) => setPf({ ...pf, specialties: e.target.value })} placeholder="مدرن، کلاسیک، مینیمال" /></div>
                  <div className="space-y-2"><Label>نرخ ساعتی (تومان)</Label><Input type="number" value={pf.hourly_rate} onChange={(e) => setPf({ ...pf, hourly_rate: e.target.value })} /></div>
                  <div className="md:col-span-2"><Button onClick={saveProfile} className="gradient-gold text-primary-foreground">{myProfile ? "بروزرسانی پروفایل" : "ساخت پروفایل طراح"}</Button></div>
                </CardContent>
              </Card>

              {myProfile && (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>نمونه کارها ({myPortfolio.length})</CardTitle>
                      <Dialog open={showPortfolioDialog} onOpenChange={setShowPortfolioDialog}>
                        <DialogTrigger asChild><Button size="sm" className="gradient-gold text-primary-foreground"><Plus size={16} className="ml-1" />افزودن</Button></DialogTrigger>
                        <DialogContent dir="rtl">
                          <DialogHeader><DialogTitle>افزودن نمونه کار</DialogTitle></DialogHeader>
                          <div className="space-y-3">
                            <div className="space-y-2"><Label>عنوان</Label><Input value={portfolioForm.title} onChange={(e) => setPortfolioForm({ ...portfolioForm, title: e.target.value })} /></div>
                            <div className="space-y-2"><Label>توضیحات</Label><Textarea value={portfolioForm.description} onChange={(e) => setPortfolioForm({ ...portfolioForm, description: e.target.value })} /></div>
                            <div className="space-y-2"><Label>تصویر (URL)</Label><Input value={portfolioForm.image_url} onChange={(e) => setPortfolioForm({ ...portfolioForm, image_url: e.target.value })} /></div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-2"><Label>نوع پروژه</Label><Input value={portfolioForm.project_type} onChange={(e) => setPortfolioForm({ ...portfolioForm, project_type: e.target.value })} /></div>
                              <div className="space-y-2"><Label>سال</Label><Input type="number" value={portfolioForm.year} onChange={(e) => setPortfolioForm({ ...portfolioForm, year: e.target.value })} /></div>
                              <div className="space-y-2"><Label>موقعیت</Label><Input value={portfolioForm.location} onChange={(e) => setPortfolioForm({ ...portfolioForm, location: e.target.value })} /></div>
                            </div>
                          </div>
                          <DialogFooter><Button onClick={addPortfolio} className="gradient-gold text-primary-foreground">ذخیره</Button></DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </CardHeader>
                    <CardContent>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {myPortfolio.map((p) => (
                          <Card key={p.id}>
                            {p.image_url && <img src={p.image_url} alt={p.title} className="w-full h-40 object-cover rounded-t-lg" />}
                            <CardContent className="pt-4 space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="font-semibold">{p.title}</div>
                                <Button size="icon" variant="ghost" onClick={() => deletePortfolio(p.id)}><Trash2 size={14} /></Button>
                              </div>
                              {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                              <div className="text-xs text-muted-foreground">{[p.project_type, p.year, p.location].filter(Boolean).join(" • ")}</div>
                            </CardContent>
                          </Card>
                        ))}
                        {myPortfolio.length === 0 && <div className="text-sm text-muted-foreground col-span-full text-center py-6">هنوز نمونه کاری اضافه نشده است</div>}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase size={20} />پروژه‌های آزاد ({openProjects.length})</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {openProjects.map((p) => (
                        <div key={p.id} className="border rounded-lg p-4 flex items-center justify-between">
                          <div>
                            <div className="font-semibold">{p.title}</div>
                            <div className="text-xs text-muted-foreground">{p.consultation_type} • {p.customer_name}{p.city ? ` • ${p.city}` : ""}</div>
                          </div>
                          <Button size="sm" onClick={() => claimProject(p)}>پذیرش</Button>
                        </div>
                      ))}
                      {openProjects.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">پروژه آزادی موجود نیست</div>}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}

        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent dir="rtl" className="max-w-3xl max-h-[85vh] overflow-y-auto">
            {selected && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    {selected.avatar_url ? (
                      <img src={selected.avatar_url} alt={selected.display_name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold">{selected.display_name.charAt(0)}</div>
                    )}
                    <div>
                      <div>{selected.display_name}</div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground"><Star size={14} className="text-gold fill-gold" />{Number(selected.rating).toFixed(1)}</div>
                    </div>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {selected.bio && <p className="text-sm">{selected.bio}</p>}
                  <div className="flex flex-wrap gap-1">
                    {(selected.specialties ?? []).map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                  </div>
                  {selected.hourly_rate && <div className="text-sm text-gold">نرخ: از {Number(selected.hourly_rate).toLocaleString("en-US")} تومان/ساعت</div>}
                  <div>
                    <h3 className="font-semibold mb-3">نمونه کارها ({selectedPortfolio.length})</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {selectedPortfolio.map((p) => (
                        <Card key={p.id}>
                          {p.image_url && <img src={p.image_url} alt={p.title} className="w-full h-40 object-cover rounded-t-lg" />}
                          <CardContent className="pt-3 space-y-1">
                            <div className="font-semibold text-sm">{p.title}</div>
                            {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                            <div className="text-xs text-muted-foreground">{[p.project_type, p.year, p.location].filter(Boolean).join(" • ")}</div>
                          </CardContent>
                        </Card>
                      ))}
                      {selectedPortfolio.length === 0 && <div className="text-sm text-muted-foreground col-span-full">نمونه کاری ثبت نشده است</div>}
                    </div>
                  </div>
                  <Button className="w-full gradient-gold text-primary-foreground" onClick={() => navigate("/consultations")}>
                    سفارش پروژه به این طراح
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
};

export default Designers;
