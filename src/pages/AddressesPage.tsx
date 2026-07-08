import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAddresses } from "@/hooks/useAddresses";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Edit, Trash2, MapPin, Check, ArrowRight, Home } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AddressesPage() {
  const navigate = useNavigate();
  const { items: addresses, loading, userId, create, update, remove, setDefault, refresh } = useAddresses();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<typeof addresses[0] | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    full_name: "",
    phone: "",
    province: "",
    city: "",
    address_line: "",
    postal_code: "",
    is_default: false,
  });

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth", { replace: true }); return; }
    };
    init();
  }, [navigate]);

  const resetForm = () => setForm({ title: "", full_name: "", phone: "", province: "", city: "", address_line: "", postal_code: "", is_default: false });

  const openCreate = () => { resetForm(); setEditing(null); setDialogOpen(true); };
  const openEdit = (addr: typeof addresses[0]) => { setEditing(addr); setForm(addr); setDialogOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await update(editing.id, form);
      } else {
        await create(form);
      }
      setDialogOpen(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-gold" size={32} /></div>;

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-gold text-sm mb-2">
            <ArrowRight size={16} /> بازگشت به داشبورد
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2"><MapPin className="text-gold" /> آدرس‌های من</h1>
        </div>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold">آدرس‌های ذخیره شده</h2>
            <Button onClick={openCreate} className="gap-2"><Plus size={16} /> افزودن آدرس</Button>
          </div>

          {addresses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="mx-auto mb-3 text-4xl opacity-30" />
              <p className="mb-4">هنوز آدرسی ثبت نشده</p>
              <Button onClick={openCreate} className="gap-2"><Plus size={16} /> اولین آدرس را اضافه کنید</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {addresses.map((addr) => (
                <Card key={addr.id} className="p-4 bg-card border-border relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gold/10"><MapPin className="text-gold" size={20} /></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{addr.title}</span>
                          {addr.is_default && <Badge variant="default" className="bg-gold/10 text-gold border-gold/30">پیش‌فرض</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{addr.full_name} — {addr.phone}</p>
                        <p className="text-sm text-muted-foreground">{addr.address_line}, {addr.city}, {addr.province} {addr.postal_code ? `— ${addr.postal_code}` : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!addr.is_default && (
                        <Button variant="outline" size="sm" onClick={() => setDefault(addr.id)} className="gap-1">
                          <Check size={14} /> پیش‌فرض
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => openEdit(addr)} className="gap-1">
                        <Edit size={14} />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => remove(addr.id)} className="gap-1">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "ویرایش آدرس" : "آدرس جدید"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 p-4">
            <div className="space-y-2"><Label>عنوان آدرس <span className="text-destructive">*</span></Label><Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="مثال: خانه، محل کار" required /></div>
            <div className="space-y-2"><Label>نام و نام خانوادگی <span className="text-destructive">*</span></Label><Input value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} required /></div>
            <div className="space-y-2"><Label>شماره تماس <span className="text-destructive">*</span></Label><Input type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>استان <span className="text-destructive">*</span></Label><Input value={form.province} onChange={(e) => setForm({...form, province: e.target.value})} required /></div>
              <div className="space-y-2"><Label>شهر <span className="text-destructive">*</span></Label><Input value={form.city} onChange={(e) => setForm({...form, city: e.target.value})} required /></div>
            </div>
            <div className="space-y-2"><Label>کد پستی</Label><Input value={form.postal_code} onChange={(e) => setForm({...form, postal_code: e.target.value})} /></div>
            <div className="space-y-2"><Label>آدرس کامل <span className="text-destructive">*</span></Label><Textarea rows={3} value={form.address_line} onChange={(e) => setForm({...form, address_line: e.target.value})} required /></div>
            <div className="flex items-center gap-2">
              <Switch id="is_default" checked={form.is_default} onCheckedChange={(v) => setForm({...form, is_default: v})} />
              <Label htmlFor="is_default" className="cursor-pointer">تنظیم به عنوان آدرس پیش‌فرض</Label>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />} ذخیره
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}