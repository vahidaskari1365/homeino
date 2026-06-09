import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Package, Store, Palette, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type ProductHit = { id: string; name: string; price: number | null; image_url: string | null; profile_id: string };
type ShopHit = { id: string; brand_name: string; city: string | null };
type DesignerHit = { id: string; full_name: string; city: string | null };
type SecondHit = { id: string; title: string; price: number | null; city: string | null };

const SearchDialog = ({ open, onOpenChange }: SearchDialogProps) => {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ProductHit[]>([]);
  const [shops, setShops] = useState<ShopHit[]>([]);
  const [designers, setDesigners] = useState<DesignerHit[]>([]);
  const [second, setSecond] = useState<SecondHit[]>([]);

  const run = useCallback(async (term: string) => {
    const t = term.trim();
    if (t.length < 2) {
      setProducts([]); setShops([]); setDesigners([]); setSecond([]);
      return;
    }
    setLoading(true);
    const like = `%${t}%`;
    const [p, s, d, sh] = await Promise.all([
      supabase.from("products").select("id,name,price,image_url,profile_id").ilike("name", like).limit(8),
      supabase.from("public_profiles").select("id,brand_name,city").ilike("brand_name", like).limit(6),
      supabase.from("designers").select("id,full_name,city").ilike("full_name", like).limit(6),
      supabase.from("public_second_hand_listings").select("id,title,price,city").ilike("title", like).limit(6),
    ]);
    setProducts((p.data as ProductHit[]) || []);
    setShops((s.data as ShopHit[]) || []);
    setDesigners((d.data as DesignerHit[]) || []);
    setSecond((sh.data as SecondHit[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => run(q), 250);
    return () => clearTimeout(t);
  }, [q, run]);

  useEffect(() => {
    if (!open) { setQ(""); setProducts([]); setShops([]); setDesigners([]); setSecond([]); }
  }, [open]);

  const close = () => onOpenChange(false);
  const total = products.length + shops.length + designers.length + second.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2"><Search size={18} className="text-gold" /> جستجوی هومینو</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-2">
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="نام محصول، فروشگاه، طراح یا آگهی..."
            className="text-base"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-6 pb-6 space-y-5">
          {loading && (
            <div className="flex justify-center py-6 text-muted-foreground"><Loader2 className="animate-spin" /></div>
          )}
          {!loading && q.trim().length >= 2 && total === 0 && (
            <p className="text-center text-muted-foreground py-8">نتیجه‌ای یافت نشد.</p>
          )}
          {!loading && q.trim().length < 2 && (
            <p className="text-center text-muted-foreground py-8 text-sm">حداقل ۲ کاراکتر وارد کنید.</p>
          )}

          {products.length > 0 && (
            <section>
              <h4 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1"><Package size={14} /> محصولات</h4>
              <div className="space-y-1">
                {products.map((p) => (
                  <Link key={p.id} to={`/shops/${p.profile_id}`} onClick={close}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted transition">
                    <div className="w-10 h-10 rounded bg-muted overflow-hidden flex-shrink-0">
                      {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      {p.price && <p className="text-xs text-gold">{p.price.toLocaleString("fa-IR")} تومان</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {shops.length > 0 && (
            <section>
              <h4 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1"><Store size={14} /> فروشگاه‌ها</h4>
              <div className="space-y-1">
                {shops.map((s) => (
                  <Link key={s.id} to={`/shops/${s.id}`} onClick={close} className="block p-2 rounded hover:bg-muted text-sm">
                    <span className="font-medium">{s.brand_name}</span>
                    {s.city && <span className="text-muted-foreground text-xs"> — {s.city}</span>}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {designers.length > 0 && (
            <section>
              <h4 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1"><Palette size={14} /> طراحان</h4>
              <div className="space-y-1">
                {designers.map((d) => (
                  <Link key={d.id} to={`/designers`} onClick={close} className="block p-2 rounded hover:bg-muted text-sm">
                    <span className="font-medium">{d.full_name}</span>
                    {d.city && <span className="text-muted-foreground text-xs"> — {d.city}</span>}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {second.length > 0 && (
            <section>
              <h4 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1"><Tag size={14} /> آگهی دست دوم</h4>
              <div className="space-y-1">
                {second.map((it) => (
                  <Link key={it.id} to="/second-hand" onClick={close} className="block p-2 rounded hover:bg-muted text-sm">
                    <span className="font-medium">{it.title}</span>
                    {it.price && <span className="text-gold text-xs"> — {it.price.toLocaleString("fa-IR")} تومان</span>}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SearchDialog;
