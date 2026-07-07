// @ts-nocheck
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Bookmark, Heart, Share2, ArrowRight, ShoppingBag, Info, ExternalLink, Sofa } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSavedInspirations } from "@/hooks/useSavedInspirations";
import ViewInMyRoomButton from "@/components/ViewInMyRoomButton";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const styleLabels: Record<string, string> = {
  "modern": "مدرن",
  "classic": "کلاسیک",
  "minimal": "مینیمال",
  "luxury": "لوکس",
  "traditional": "سنتی",
  "industrial": "صنعتی",
  "scandinavian": "اسکاندیناوی",
  "bohemian": "بوهمی"
};

const roomTypeLabels: Record<string, string> = {
  "living": "نشیمن",
  "bedroom": "اتاق خواب",
  "kitchen": "آشپزخانه",
  "bathroom": "حمام و سرویس",
  "office": "اتاق کار",
  "dining": "ناهارخوری",
  "outdoor": "فضای باز"
};

const InspirationDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const { saveInspiration, collections } = useSavedInspirations();
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);

  const { data: inspiration, isLoading } = useQuery({
    queryKey: ["inspiration", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspirations")
        .select(`
          *,
          products:inspiration_products(
            *,
            product:products(*)
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: related } = useQuery({
    queryKey: ["related-inspirations", inspiration?.style, inspiration?.room_type],
    enabled: !!inspiration,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspirations")
        .select("*")
        .eq("style", inspiration?.style)
        .neq("id", inspiration?.id)
        .limit(4);
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-cream-dark"><div className="loading-spinner" /></div>;
  if (!inspiration) return <div>یافت نشد</div>;

  const isSaved = collections?.some(c => c.items.some(i => i.inspiration_id === inspiration.id));

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "کپی شد",
      description: "لینک صفحه در حافظه کپی شد.",
    });
  };

  return (
    <div className="min-h-screen bg-cream-dark">
      <Navbar />

      <main className="container mx-auto px-6 py-24">
        <Link to="/inspirations" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowRight size={20} />
          <span>بازگشت به گالری</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left: Large Image with Hotspots */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="relative rounded-[2.5rem] overflow-hidden shadow-luxury bg-card aspect-[4/5] sm:aspect-video lg:aspect-auto">
              <img
                src={inspiration.image_url}
                alt={inspiration.title_fa || inspiration.title}
                className="w-full h-full object-cover"
              />
              
              {/* Product Hotspots */}
              {inspiration.products?.map((item) => (
                <div
                  key={item.id}
                  className="absolute z-20 group"
                  style={{ left: `${item.x_position}%`, top: `${item.y_position}%` }}
                  onMouseEnter={() => setHoveredProduct(item.product_id)}
                  onMouseLeave={() => setHoveredProduct(null)}
                >
                  <div className="relative">
                    <div className="w-6 h-6 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer shadow-luxury border border-white/50 animate-pulse">
                      <ShoppingBag size={12} className="text-primary" />
                    </div>
                    
                    {/* Hover Card */}
                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 bg-white rounded-xl shadow-2xl p-3 transition-all duration-300 pointer-events-none opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 ${hoveredProduct === item.product_id ? 'opacity-100 translate-y-0' : ''}`}>
                      <img src={item.product?.image_url || ''} className="w-full h-24 object-cover rounded-lg mb-2" />
                      <h4 className="font-bold text-xs text-charcoal line-clamp-1">{item.product?.name}</h4>
                      <p className="text-[10px] text-primary font-bold mt-1">
                        {item.product?.price ? `${item.product.price.toLocaleString()} تومان` : "تماس بگیرید"}
                      </p>
                      <div className="mt-2">
                        <ViewInMyRoomButton
                          productId={item.product_id}
                          productName={item.product?.name || ""}
                          productImage={item.product?.image_url}
                          productPrice={item.product?.price}
                          variant="full"
                          className="w-full text-[10px]"
                        />
                      </div>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-card rounded-3xl p-8 border border-border/50">
              <h1 className="text-3xl font-black mb-4">{inspiration.title_fa || inspiration.title}</h1>
              <div className="flex flex-wrap gap-2 mb-6">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                  {styleLabels[inspiration.style || ""] || inspiration.style}
                </Badge>
                <Badge variant="outline" className="bg-gold/5 text-gold border-gold/20">
                  {roomTypeLabels[inspiration.room_type || ""] || inspiration.room_type}
                </Badge>
              </div>
              <p className="text-muted-foreground text-lg leading-relaxed whitespace-pre-wrap">
                {inspiration.description_fa || inspiration.description}
              </p>
            </div>
          </div>

          {/* Right: Sidebar Metadata */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-card rounded-3xl p-6 border border-border/50 shadow-sm sticky top-24">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                   <button className="flex items-center gap-1.5 text-muted-foreground hover:text-red-500 transition-colors">
                     <Heart size={20} />
                     <span className="text-sm font-bold">{inspiration.save_count || 0}</span>
                   </button>
                   <button onClick={handleShare} className="text-muted-foreground hover:text-primary transition-colors">
                     <Share2 size={20} />
                   </button>
                </div>
                <Button
                  onClick={() => !isSaved && saveInspiration.mutate({ inspirationId: inspiration.id })}
                  className={`rounded-full px-6 font-bold ${isSaved ? "bg-primary" : "gradient-gold"}`}
                >
                  <Bookmark size={18} className={`ml-2 ${isSaved ? "fill-current" : ""}`} />
                  {isSaved ? "ذخیره شد" : "ذخیره در مجموعه"}
                </Button>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
                    <Info size={16} /> رنگ‌های پیشنهادی
                  </h4>
                  <div className="flex gap-2">
                    {Array.isArray(inspiration.color_palette) && inspiration.color_palette.map((color: string) => (
                      <div
                        key={color}
                        className="w-8 h-8 rounded-full border border-black/10 shadow-inner"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-muted-foreground mb-3">هشتگ‌ها</h4>
                  <div className="flex flex-wrap gap-2">
                    {inspiration.tags?.map((tag: string) => (
                      <span key={tag} className="text-xs bg-muted px-3 py-1.5 rounded-lg text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-border/50">
                  <h4 className="text-sm font-bold text-muted-foreground mb-3">منبع</h4>
                  <a
                    href={inspiration.source_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                  >
                    <span className="text-sm font-semibold">{inspiration.source_name || "منبع اصلی"}</span>
                    <ExternalLink size={14} className="text-muted-foreground group-hover:text-primary" />
                  </a>
                </div>
              </div>
            </div>

            {/* Shop the Look Sidebar Section */}
            {inspiration.products && inspiration.products.length > 0 && (
              <div className="bg-card rounded-3xl p-6 border border-border/50 shadow-sm">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <ShoppingBag className="text-primary" size={20} /> محصولات این طرح
                </h3>
                <div className="space-y-4">
                  {inspiration.products.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-2 rounded-2xl hover:bg-muted transition-colors group"
                      onMouseEnter={() => setHoveredProduct(item.product_id)}
                      onMouseLeave={() => setHoveredProduct(null)}
                    >
                      <Link to={`/product/${item.product?.id}`}>
                        <img src={item.product?.image_url || ''} className="w-16 h-16 object-cover rounded-xl shadow-sm" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link to={`/product/${item.product?.id}`}>
                          <h4 className="font-bold text-xs line-clamp-1 group-hover:text-primary transition-colors">{item.product?.name}</h4>
                        </Link>
                        <p className="text-[11px] text-primary font-bold mt-0.5">
                          {item.product?.price ? `${item.product.price.toLocaleString()} تومان` : "مشاهده قیمت"}
                        </p>
                        <ViewInMyRoomButton
                          productId={item.product_id}
                          productName={item.product?.name || ""}
                          productImage={item.product?.image_url}
                          productPrice={item.product?.price}
                          variant="full"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Inspirations */}
        {related && related.length > 0 && (
          <div className="mt-24">
            <h2 className="text-2xl font-bold mb-8">طرح‌های مشابه</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {related.map((item) => (
                <Link
                  key={item.id}
                  to={`/inspirations/${item.id}`}
                  className="group relative aspect-[4/5] rounded-2xl overflow-hidden shadow-md"
                >
                  <img src={item.image_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <h4 className="text-white font-bold text-sm">{item.title_fa || item.title}</h4>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default InspirationDetail;
