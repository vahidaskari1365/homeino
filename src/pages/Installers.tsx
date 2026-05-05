import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Hammer, MapPin, Phone, Star, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatPersianDate } from "@/lib/date";

type Specialty = "curtain" | "chandelier" | "cabinet" | "wallpaper" | "flooring" | "painting" | "other";
type BookingStatus = "pending" | "confirmed" | "completed" | "rejected" | "cancelled";

const specialtyLabels: Record<Specialty, string> = {
  curtain: "نصاب پرده",
  chandelier: "نصاب لوستر",
  cabinet: "نصاب کابینت",
  wallpaper: "نصاب کاغذ دیواری",
  flooring: "نصاب کفپوش",
  painting: "نقاش",
  other: "سایر",
};

const statusLabels: Record<BookingStatus, string> = {
  pending: "در انتظار",
  confirmed: "تأیید شده",
  completed: "انجام شده",
  rejected: "رد شده",
  cancelled: "لغو شده",
};

const statusVariant: Record<BookingStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary", confirmed: "default", completed: "outline", rejected: "destructive", cancelled: "destructive",
};

type Installer = {
  id: string; user_id: string; display_name: string; specialties: Specialty[];
  city: string | null; phone: string | null; bio: string | null; base_rate: number | null;
  rating: number; is_active: boolean;
};

type Booking = {
  id: string; customer_id: string; installer_id: string; specialty: Specialty;
  status: BookingStatus; customer_name: string; customer_phone: string;
  city: string | null; address: string | null; description: string | null;
  preferred_date: string | null; preferred_time_range: string | null;
  final_price: number | null; installer_note: string | null; created_at: string;
};

const Installers = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [installers, setInstallers] = useState<Installer[]>([]);
  const [filter, setFilter] = useState<Specialty | "all">("all");
  const [myInstaller, setMyInstaller] = useState<Installer | null>(null);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [installerBookings, setInstallerBookings] = useState<Booking[]>([]);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);

    const { data: ins } = await supabase.from("installers").select("*").eq("is_active", true).order("rating", { ascending: false });
    setInstallers((ins as Installer[]) || []);

    if (user) {
      const { data: mine } = await supabase.from("installers").select("*").eq("user_id", user.id).maybeSingle();
      setMyInstaller(mine as Installer | null);

      const { data: mb } = await supabase.from("installer_bookings").select("*").eq("customer_id", user.id).order("created_at", { ascending: false });
      setMyBookings((mb as Booking[]) || []);

      if (mine) {
        const { data: ib } = await supabase.from("installer_bookings").select("*").eq("installer_id", (mine as any).id).order("created_at", { ascending: false });
        setInstallerBookings((ib as Booking[]) || []);
      }
    }
  };

  useEffect(() => {
    load();
    document.title = "نصاب‌ها و مجریان | هومینو";
  }, []);

  const filtered = filter === "all" ? installers : installers.filter((i) => i.specialties.includes(filter));

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <main className="container mx-auto px-6 pt-28 pb-16">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
          <h1 className="text-3xl font-display text-gold font-bold flex items-center gap-2">
            <Hammer /> نصاب‌ها و مجریان
          </h1>
          {userId && <InstallerProfileDialog existing={myInstaller} onSaved={load} />}
        </div>
        <p className="text-muted-foreground mb-8">نصاب پرده، لوستر، کابینت، کاغذ دیواری و سایر مجریان را پیدا کنید و مستقیم رزرو دهید.</p>

        <Tabs defaultValue="browse">
          <TabsList>
            <TabsTrigger value="browse">جستجوی نصاب</TabsTrigger>
            {userId && <TabsTrigger value="mine">رزروهای من ({myBookings.length})</TabsTrigger>}
            {myInstaller && <TabsTrigger value="installer">پنل نصاب ({installerBookings.length})</TabsTrigger>}
          </TabsList>

          <TabsContent value="browse" className="mt-6 space-y-4">
            <div className="flex items-center gap-3">
              <Label>تخصص:</Label>
              <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
                <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  {(Object.keys(specialtyLabels) as Specialty[]).map((k) => (
                    <SelectItem key={k} value={k}>{specialtyLabels[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">نصابی یافت نشد.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((i) => (
                  <Card key={i.id} className="hover:border-gold/50 transition-colors">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{i.display_name}</span>
                        <span className="flex items-center gap-1 text-sm text-gold">
                          <Star size={14} fill="currentColor" />{Number(i.rating).toFixed(1)}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {i.specialties.map((s) => (
                          <Badge key={s} variant="secondary">{specialtyLabels[s]}</Badge>
                        ))}
                      </div>
                      {i.city && <p className="text-muted-foreground"><MapPin size={14} className="inline ml-1" />{i.city}</p>}
                      {i.phone && <p className="text-muted-foreground"><Phone size={14} className="inline ml-1" />{i.phone}</p>}
                      {i.bio && <p className="text-muted-foreground line-clamp-2">{i.bio}</p>}
                      {i.base_rate && <p className="text-gold font-semibold">از {new Intl.NumberFormat("fa-IR").format(i.base_rate)} تومان</p>}
                      <BookingDialog installer={i} onBooked={load} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {userId && (
            <TabsContent value="mine" className="mt-6 space-y-3">
              {myBookings.length === 0 ? (
                <p className="text-muted-foreground">رزروی ثبت نکرده‌اید.</p>
              ) : myBookings.map((b) => (
                <Card key={b.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <CardTitle className="text-base">{specialtyLabels[b.specialty]}</CardTitle>
                    <Badge variant={statusVariant[b.status]}>{statusLabels[b.status]}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    {b.preferred_date && <p className="text-muted-foreground">{formatPersianDate(b.preferred_date)} {b.preferred_time_range}</p>}
                    {b.description && <p>{b.description}</p>}
                    {b.final_price && <p className="text-gold font-semibold">قیمت: {new Intl.NumberFormat("fa-IR").format(b.final_price)} تومان</p>}
                    {b.installer_note && (
                      <div className="p-2 rounded bg-muted/50 border border-border">
                        <span className="text-xs text-muted-foreground">یادداشت نصاب:</span>
                        <p>{b.installer_note}</p>
                      </div>
                    )}
                    {b.status === "pending" && (
                      <Button size="sm" variant="destructive" onClick={async () => {
                        await supabase.from("installer_bookings").update({ status: "cancelled" }).eq("id", b.id);
                        load();
                      }}>لغو</Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          )}

          {myInstaller && (
            <TabsContent value="installer" className="mt-6 space-y-3">
              {installerBookings.length === 0 ? (
                <p className="text-muted-foreground">رزروی برای شما ثبت نشده.</p>
              ) : installerBookings.map((b) => (
                <InstallerBookingCard key={b.id} booking={b} onUpdate={load} />
              ))}
            </TabsContent>
          )}
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

const InstallerProfileDialog = ({ existing, onSaved }: { existing: Installer | null; onSaved: () => void }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(existing?.display_name || "");
  const [city, setCity] = useState(existing?.city || "");
  const [phone, setPhone] = useState(existing?.phone || "");
  const [bio, setBio] = useState(existing?.bio || "");
  const [rate, setRate] = useState(existing?.base_rate?.toString() || "");
  const [specs, setSpecs] = useState<Specialty[]>(existing?.specialties || []);
  const [active, setActive] = useState(existing?.is_active ?? true);

  const toggleSpec = (s: Specialty) =>
    setSpecs((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const save = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast({ title: "ابتدا وارد شوید", variant: "destructive" });
    if (!name.trim()) return toast({ title: "نام الزامی است", variant: "destructive" });

    const payload: any = {
      user_id: user.id, display_name: name.trim(), city: city.trim() || null,
      phone: phone.trim() || null, bio: bio.trim() || null,
      base_rate: rate ? Number(rate) : null, specialties: specs, is_active: active,
    };
    const { error } = existing
      ? await supabase.from("installers").update(payload).eq("id", existing.id)
      : await supabase.from("installers").insert(payload);
    if (error) return toast({ title: "خطا", description: error.message, variant: "destructive" });
    toast({ title: "ذخیره شد" });
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1">
          <Plus size={16} /> {existing ? "ویرایش پروفایل نصاب" : "ثبت‌نام به‌عنوان نصاب"}
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader><DialogTitle>پروفایل نصاب / مجری</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>نام نمایشی</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>شهر</Label><Input value={city} onChange={(e) => setCity(e.target.value)} maxLength={50} /></div>
            <div><Label>تلفن</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} /></div>
          </div>
          <div><Label>تعرفه پایه (تومان)</Label><Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} /></div>
          <div><Label>توضیحات</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500} /></div>
          <div>
            <Label>تخصص‌ها</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {(Object.keys(specialtyLabels) as Specialty[]).map((s) => (
                <Badge key={s} variant={specs.includes(s) ? "default" : "outline"}
                  className="cursor-pointer" onClick={() => toggleSpec(s)}>
                  {specialtyLabels[s]}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={active} onCheckedChange={setActive} id="active" />
            <Label htmlFor="active">فعال (قابل مشاهده برای مشتریان)</Label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} className="gradient-gold text-primary-foreground">ذخیره</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const BookingDialog = ({ installer, onBooked }: { installer: Installer; onBooked: () => void }) => {
  const [open, setOpen] = useState(false);
  const [specialty, setSpecialty] = useState<Specialty>(installer.specialties[0] || "other");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState(installer.city || "");
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast({ title: "ابتدا وارد شوید", variant: "destructive" });
    if (!name.trim() || !phone.trim()) return toast({ title: "نام و تلفن الزامی است", variant: "destructive" });
    setLoading(true);
    const { error } = await supabase.from("installer_bookings").insert({
      customer_id: user.id, installer_id: installer.id, specialty,
      customer_name: name.trim(), customer_phone: phone.trim(),
      city: city.trim() || null, address: address.trim() || null,
      preferred_date: date || null, preferred_time_range: time.trim() || null,
      description: desc.trim() || null,
    });
    setLoading(false);
    if (error) return toast({ title: "خطا", description: error.message, variant: "destructive" });
    toast({ title: "رزرو شد", description: "نصاب درخواست شما را بررسی می‌کند." });
    setOpen(false);
    onBooked();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full gradient-gold text-primary-foreground mt-2">رزرو نصاب</Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader><DialogTitle>رزرو {installer.display_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>نوع خدمت</Label>
            <Select value={specialty} onValueChange={(v) => setSpecialty(v as Specialty)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {installer.specialties.map((s) => (
                  <SelectItem key={s} value={s}>{specialtyLabels[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>نام</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></div>
            <div><Label>تلفن</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} /></div>
            <div><Label>شهر</Label><Input value={city} onChange={(e) => setCity(e.target.value)} maxLength={50} /></div>
            <div><Label>تاریخ پیشنهادی</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="col-span-2"><Label>بازه ساعتی</Label><Input value={time} onChange={(e) => setTime(e.target.value)} maxLength={50} /></div>
            <div className="col-span-2"><Label>آدرس</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} /></div>
            <div className="col-span-2"><Label>توضیحات</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} maxLength={1000} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={loading} className="gradient-gold text-primary-foreground">
            {loading ? "در حال ارسال..." : "ثبت رزرو"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const InstallerBookingCard = ({ booking: b, onUpdate }: { booking: Booking; onUpdate: () => void }) => {
  const [note, setNote] = useState(b.installer_note || "");
  const [price, setPrice] = useState(b.final_price?.toString() || "");

  const update = async (status: BookingStatus) => {
    const { error } = await supabase.from("installer_bookings").update({
      status, installer_note: note || null, final_price: price ? Number(price) : null,
    }).eq("id", b.id);
    if (error) return toast({ title: "خطا", description: error.message, variant: "destructive" });
    toast({ title: "به‌روزرسانی شد" });
    onUpdate();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <CardTitle className="text-base">{specialtyLabels[b.specialty]} — {b.customer_name}</CardTitle>
        <Badge variant={statusVariant[b.status]}>{statusLabels[b.status]}</Badge>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex flex-wrap gap-3 text-muted-foreground">
          <a href={`tel:${b.customer_phone}`} className="hover:text-gold"><Phone size={14} className="inline ml-1" />{b.customer_phone}</a>
          {b.preferred_date && <span>{formatPersianDate(b.preferred_date)} {b.preferred_time_range}</span>}
          {b.city && <span><MapPin size={14} className="inline ml-1" />{b.city}</span>}
        </div>
        {b.address && <p className="text-muted-foreground">آدرس: {b.address}</p>}
        {b.description && <p>{b.description}</p>}

        {(b.status === "pending" || b.status === "confirmed") && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">قیمت نهایی (تومان)</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            </div>
            <div><Label className="text-xs">یادداشت</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} /></div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => update("confirmed")}>تأیید</Button>
              <Button size="sm" variant="outline" onClick={() => update("completed")}>انجام شد</Button>
              <Button size="sm" variant="destructive" onClick={() => update("rejected")}>رد</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Installers;
