// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Scale, ArrowLeft, Star, X, ShoppingBag } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useCompare } from "@/contexts/CompareContext";
import ViewInMyRoomButton from "@/components/ViewInMyRoomButton";
import { cn } from "@/lib/utils";

type Enriched = {
  id: string;
  shop_name?: string;
  shop_id?: string;
  attributes?: Record<string, unknown>;
  rating?: number;
};

const Compare = () => {
  const { items, remove, clear } = useCompare();
  const [enriched, setEnriched] = useState<Record<string, Enriched>>({});

  useEffect(() => {
    const ids = items.map((i) => i.id);
    if (ids.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, attributes, rating, store_id, stores!store_id(id, name)")
        .in("id", ids);
      const map: Record<string, Enriched> = {};
      (data || []).forEach((p: { id: string; attributes: Record<string, unknown> | null; rating: number | null; store_id: string | null; stores: { id: string; name: string | null } | null }) => {
        map[p.id] = {
          id: p.id,
          attributes: p.attributes || {},
          rating: Number(p.rating || 0),
          shop_id: p.stores?.id,
          shop_name: p.stores?.name,
        };
      });
      setEnriched(map);
    })();
  }, [items]);

  const attrKeys = useMemo(() => {
    const keys = new Set<string>();
    items.forEach((it) => {
      const attrs = enriched[it.id]?.attributes || it.attributes || {};
      Object.keys(attrs).forEach((k) => keys.add(k));
    });
    return Array.from(keys);
  }, [items, enriched]);

  const fmtPrice = (p: number | null) =>
    p == null ? "—" : new Intl.NumberFormat("fa-IR").format(p) + " تومان";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-6 pt-28 pb-16">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Scale className="text-gold" size={28} />
            <h1 className="text-3xl font-display text-foreground">مقایسه محصولات</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/shops"><ArrowRight size={16} /> فروشگاه‌ها</Link>
            </Button>
            {items.length > 0 && (
              <Button variant="ghost" onClick={clear}>پاک کردن همه</Button>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-lg">
            <Scale className="mx-auto text-muted-foreground mb-4" size={48} />
            <p className="text-muted-foreground mb-4">هیچ محصولی برای مقایسه انتخاب نشده است</p>
            <Button asChild><Link to="/shops">رفتن به فروشگاه‌ها</Link></Button>
          </div>
        ) : (
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-4 text-right font-medium text-muted-foreground w-40">ویژگی</th>
                  {items.map((it) => (
                    <th key={it.id} className="p-4 text-center min-w-[200px] align-top">
                      <div className="flex flex-col items-center gap-2">
                        <button
                          onClick={() => remove(it.id)}
                          className="self-end text-muted-foreground hover:text-destructive"
                        >
                          <X size={16} />
                        </button>
                        <div className="w-32 h-32 bg-muted rounded overflow-hidden">
                          {it.image_url ? (
                            <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">—</div>
                          )}
                        </div>
                        <div className="font-semibold text-foreground">{it.name}</div>
                        <ViewInMyRoomButton
                          productId={it.id}
                          productName={it.name}
                          productImage={it.image_url}
                          productPrice={it.price}
                          variant="full"
                          className="mt-1"
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <Row label="قیمت">
                  {items.map((it) => (
                    <td key={it.id} className="p-4 text-center text-gold font-bold">{fmtPrice(it.price)}</td>
                  ))}
                </Row>
                <Row label="فروشگاه">
                  {items.map((it) => {
                    const e = enriched[it.id];
                    return (
                      <td key={it.id} className="p-4 text-center">
                        {e?.shop_id ? (
                          <Link to={`/shops/${e.shop_id}`} className="text-gold hover:underline">
                            {e.shop_name || "—"}
                          </Link>
                        ) : "—"}
                      </td>
                    );
                  })}
                </Row>
                <Row label="امتیاز">
                  {items.map((it) => {
                    const r = enriched[it.id]?.rating ?? it.rating ?? 0;
                    return (
                      <td key={it.id} className="p-4 text-center">
                        <span className="text-gold">★</span> {r > 0 ? r.toFixed(1) : "—"}
                      </td>
                    );
                  })}
                </Row>
                {attrKeys.map((key) => (
                  <Row key={key} label={key}>
                    {items.map((it) => {
                      const v = (enriched[it.id]?.attributes || it.attributes || {})[key];
                      return (
                        <td key={it.id} className="p-4 text-center text-foreground">
                          {v == null || v === "" ? "—" : String(v)}
                        </td>
                      );
                    })}
                  </Row>
                ))}
                {attrKeys.length === 0 && (
                  <tr>
                    <td colSpan={items.length + 1} className="p-4 text-center text-muted-foreground text-xs">
                      مشخصات بیشتری برای این محصولات ثبت نشده است
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <tr className={cn("border-t border-border")}>
    <td className="p-4 font-medium text-muted-foreground bg-muted/20">{label}</td>
    {children}
  </tr>
);

export default Compare;
