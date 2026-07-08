import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Package, Store, Palette, Tag, BookOpen, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VisualSearch from "./VisualSearch";
import ViewInMyRoomButton from "./ViewInMyRoomButton";
import { CONTENT_TYPE_LABELS } from "@/types/content-hub";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type ProductHit = { id: string; name: string; price: number | null; image_url: string | null; profile_id: string };
type ShopHit = { id: string; brand_name: string; city: string | null };
type DesignerHit = { id: string; display_name: string };
type SecondHit = { id: string; title: string; price: number | null; city: string | null };
type ContentHit = { id: string; title: string; title_fa: string | null; image_url: string; content_type: string; summary: string | null };

const SearchDialog = ({ open, onOpenChange }: SearchDialogProps) => {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ProductHit[]>([]);
  const [shops, setShops] = useState<ShopHit[]>([]);
  const [designers, setDesigners] = useState<DesignerHit[]>([]);
  const [second, setSecond] = useState<SecondHit[]>([]);
  const [contents, setContents] = useState<ContentHit[]>([]);

  const run = useCallback(async (term: string) => {
    const t = term.trim();
    if (t.length < 2) {
      setProducts([]); setShops([]); setDesigners([]); setSecond([]); setContents([]);
      return;
    }
    setLoading(true);

    const { data: rpcData, error: rpcError } = await supabase.rpc("search_all", { query: t });

    if (!rpcError && rpcData) {
      const res = rpcData as { products: ProductHit[]; profiles: ShopHit[]; second_hand: SecondHit[] };
      setProducts(res.products || []);
      setShops(res.profiles || []);
      setSecond(res.second_hand || []);
      const [dData, cData] = await Promise.all([
        supabase.from("designers").select("id,display_name").eq("is_active", true).ilike("display_name", `%${t}%`).limit(6),
        supabase.from("inspirations").select("id,title,title_fa,image_url,content_type,summary").eq("ai_processed", true).or(`title_fa.ilike.%${t}%,title.ilike.%${t}%,summary.ilike.%${t}%`).order("popularity", { ascending: false }).limit(6),
      ]);
      setDesigners((dData.data as DesignerHit[]) || []);
      setContents((cData.data as ContentHit[]) || []);
    } else {
      const [p, s, d, sh, c] = await Promise.all([
        supabase.from("products").select("id,name,price,image_url,profile_id").textSearch("name", t, { config: 'simple', type: 'websearch' }).limit(8),
        supabase.from("public_profiles").select("id,brand_name,city").textSearch("brand_name", t, { config: 'simple', type: 'websearch' }).limit(6),
        supabase.from("designers").select("id,display_name").eq("is_active", true).ilike("display_name", `%${t}%`).limit(6),
        supabase.from("public_second_hand_listings").select("id,title,price,city").textSearch("title", t, { config: 'simple', type: 'websearch' }).limit(6),
        supabase.from("inspirations").select("id,title,title_fa,image_url,content_type,summary").eq("ai_processed", true).or(`title_fa.ilike.%${t}%,title.ilike.%${t}%,summary.ilike.%${t}%`).order("popularity", { ascending: false }).limit(6),
      ]);
      setProducts((p.data as ProductHit[]) || []);
      setShops((s.data as ShopHit[]) || []);
      setDesigners((d.data as DesignerHit[]) || []);
      setSecond((sh.data as SecondHit[]) || []);
      setContents((c.data as ContentHit[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => run(q), 250);
    return () => clearTimeout(t);
  }, [q, run]);

  useEffect(() => {
    if (!open) { setQ(""); setProducts([]); setShops([]); setDesigners([]); setSecond([]); setContents([]); }
  }, [open]);

  const close = () => onOpenChange(false);
  const total = products.length + shops.length + designers.length + second.length + contents.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2"><Search size={18} className="text-gold" /> جستجوی هومینو</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="text" dir="rtl" className="px-6 pb-6">
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="text" className="flex-1 gap-1.5">
              <Search size={14} /> جستجوی متنی
            </TabsTrigger>
            <TabsTrigger value="visual" className="flex-1 gap-1.5">
              <ImageIcon size={14} /> جستجوی تصویری
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="mt-0 space-y-4">
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="نام محصول، فروشگاه، طراح، آگهی یا محتوا..."
              className="text-base"
            />
            <div className="max-h-[55vh] overflow-y-auto space-y-5">
              {loading && (
                <div className="flex justify-center py-6 text-muted-foreground"><Loader2 className="animate-spin" /></div>
              )}
              {!loading && q.trim().length >= 2 && total === 0 && (
                <p className="text-center text-muted-foreground py-8">نتیجه‌ای یافت نشد.</p>
              )}
              {!loading && q.trim().length < 2 && (
                <p className="text-center text-muted-foreground py-8 text-sm">حداقل ۲ کاراکتر وارد کنید.</p>
              )}

              {contents.length > 0 && (
                <section>
                  <h4 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1"><BookOpen size={14} /> محتوا</h4>
                  <div className="space-y-1">
                    {contents.map((c) => (
                      <Link key={c.id} to={`/inspirations/${c.id}`} onClick={close} className="flex items-center gap-3 p-2 rounded hover:bg-muted transition group">
                        <div className="w-10 h-10 rounded bg-muted overflow-hidden flex-shrink-0">
                          <img src={c.image_url} alt={c.title_fa || c.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.title_fa || c.title}</p>
                          <p className="text-[10px] text-muted-foreground">{CONTENT_TYPE_LABELS[c.content_type] || c.content_type}{c.summary ? ` — ${c.summary.slice(0, 40)}...` : ""}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {products.length > 0 && (
                <section>
                  <h4 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1"><Package size={14} /> محصولات</h4>
                  <div className="space-y-1">
                    {products.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted transition group">
                        <Link to={`/product/${p.id}`} onClick={close}
                          className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded bg-muted overflow-hidden flex-shrink-0">
                            {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            {p.price && <p className="text-xs text-gold">{p.price.toLocaleString("en-US")} تومان</p>}
                          </div>
                        </Link>
                        <ViewInMyRoomButton
                          productId={p.id}
                          productName={p.name}
                          productImage={p.image_url}
                          productPrice={p.price}
                          variant="full"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] shrink-0"
                        />
                      </div>
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
                        <span className="font-medium">{d.display_name}</span>
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
                        {it.price && <span className="text-gold text-xs"> — {it.price.toLocaleString("en-US")} تومان</span>}
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </TabsContent>

          <TabsContent value="visual" className="mt-0">
            <VisualSearch onClose={close} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SearchDialog;
