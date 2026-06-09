import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Heart, Package, Sparkles, Layers, Trash2, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWishlist, type WishlistItem, type WishlistItemType } from "@/hooks/useWishlist";

const TYPE_META: Record<WishlistItemType, { label: string; icon: typeof Package }> = {
  product: { label: "محصولات", icon: Package },
  set: { label: "ست‌های دکوراسیون", icon: Layers },
  ai_design: { label: "طراحی‌های AI", icon: Sparkles },
};

const ItemCard = ({ item, onRemove }: { item: WishlistItem; onRemove: () => void }) => (
  <Card className="overflow-hidden hover:border-gold/50 transition-colors">
    <div className="aspect-square bg-muted overflow-hidden">
      {item.image_url ? (
        <img src={item.image_url} alt={item.title} loading="lazy"
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
          <Heart size={40} />
        </div>
      )}
    </div>
    <CardContent className="p-4 space-y-2">
      <h3 className="font-semibold line-clamp-1">{item.title}</h3>
      {item.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
      )}
      {item.price != null && (
        <p className="text-gold font-bold">
          {new Intl.NumberFormat("fa-IR").format(item.price)} تومان
        </p>
        )}
        <div className="flex gap-2 mt-2">
        <Link to={item.item_type === 'product' ? `/shops/${item.metadata?.profile_id || ''}` : '/wishlist'} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">مشاهده</Button>
        </Link>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive p-2" onClick={onRemove}>
          <Trash2 size={14} />
        </Button>
        </div>
        </CardContent>
        </Card>
);

const Wishlist = () => {
  const { items, loading, userId, remove } = useWishlist();

  const grouped = useMemo(() => {
    const g: Record<WishlistItemType, WishlistItem[]> = { product: [], set: [], ai_design: [] };
    items.forEach((i) => g[i.item_type].push(i));
    return g;
  }, [items]);

  if (!userId && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-6 pt-32 pb-16 text-center">
          <Heart className="mx-auto text-gold mb-4" size={48} />
          <h1 className="text-3xl font-display font-bold mb-2">علاقه‌مندی‌های شما</h1>
          <p className="text-muted-foreground mb-6">برای دیدن لیست علاقه‌مندی‌ها وارد شوید.</p>
          <Link to="/auth">
            <Button className="gradient-gold text-primary-foreground">ورود / ثبت‌نام</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-6 pt-32 pb-16">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-gold mb-6">
          <ArrowLeft size={16} /> بازگشت به خانه
        </Link>
        <div className="flex items-center gap-3 mb-8">
          <Heart className="text-gold" size={28} />
          <h1 className="text-3xl font-display font-bold">علاقه‌مندی‌های شما</h1>
          <span className="text-muted-foreground text-sm">({items.length} مورد)</span>
        </div>

        <Tabs defaultValue="product" dir="rtl">
          <TabsList className="mb-6">
            {(Object.keys(TYPE_META) as WishlistItemType[]).map((t) => {
              const Icon = TYPE_META[t].icon;
              return (
                <TabsTrigger key={t} value={t} className="gap-2">
                  <Icon size={16} /> {TYPE_META[t].label}
                  <span className="text-xs text-muted-foreground">({grouped[t].length})</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(Object.keys(TYPE_META) as WishlistItemType[]).map((t) => (
            <TabsContent key={t} value={t}>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-square" />)}
                </div>
              ) : grouped[t].length === 0 ? (
                <p className="text-center text-muted-foreground py-16">
                  هنوز چیزی در «{TYPE_META[t].label}» ذخیره نکرده‌اید.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {grouped[t].map((it) => (
                    <ItemCard key={it.id} item={it} onRemove={() => remove(it.item_type, it.item_id)} />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Wishlist;
