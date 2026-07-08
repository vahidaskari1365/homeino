import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bookmark,
  Heart,
  Share2,
  ArrowRight,
  ShoppingBag,
  Info,
  ExternalLink,
  Clock,
  User,
  Sparkles,
} from "lucide-react";
import { useSavedInspirations } from "@/hooks/useSavedInspirations";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { ContentHubItem } from "@/types/content-hub";
import { CONTENT_TYPE_LABELS, STYLE_LABELS, ROOM_LABELS } from "@/types/content-hub";
import ContentSEO from "@/components/ContentSEO";
import DesignCTA from "@/components/DesignCTA";
import RelatedContent from "@/components/RelatedContent";
import RelatedProducts from "@/components/RelatedProducts";
import VideoEmbed from "@/components/VideoEmbed";
import ContentGallery from "@/components/ContentGallery";
import ContentTracking from "@/components/ContentTracking";
import { useRelatedContent, useContentProducts } from "@/hooks/useContentHub";

const InspirationDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const { saveInspiration, collections } = useSavedInspirations();
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);

  const { data: item, isLoading } = useQuery({
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
      return data as ContentHubItem & {
        products?: Array<{
          id: string;
          product_id: string;
          x_position: number;
          y_position: number;
          product?: {
            id: string;
            name: string;
            price: number | null;
            image_url: string | null;
          } | null;
        }>;
      };
    },
  });

  const { data: relatedItems } = useRelatedContent(
    id || "",
    item?.style || undefined,
    item?.room_type || undefined
  );

  const { data: relatedProducts } = useContentProducts(id || "");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-dark">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-dark">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">محتوا یافت نشد</h2>
          <Link to="/inspirations" className="text-primary hover:underline">
            بازگشت به مرکز محتوا
          </Link>
        </div>
      </div>
    );
  }

  const isSaved = collections?.some((c) =>
    c.items.some((i) => i.inspiration_id === item.id)
  );
  const type = item.content_type || "inspiration";
  const typeLabel = CONTENT_TYPE_LABELS[type] || type;
  const styleLabel = item.style ? STYLE_LABELS[item.style] || item.style : null;
  const roomLabel = item.room_type ? ROOM_LABELS[item.room_type] || item.room_type : null;
  const gallery = (item.gallery as string[]) || [];
  const colorPalette = Array.isArray(item.color_palette) ? item.color_palette : [];
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const materials = Array.isArray(item.materials) ? item.materials : [];
  const isProjectShowcase = item.is_project_showcase || false;
  const isCustomerShowcase = item.is_customer_showcase || false;
  const isVideo = type === "video" || !!item.video_url;
  const hasBeforeAfter = !!(item.before_image_url || item.after_image_url);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "کپی شد", description: "لینک صفحه در حافظه کپی شد." });
  };

  return (
    <div className="min-h-screen bg-cream-dark">
      <ContentSEO item={item} />
      <ContentTracking item={item} />
      <Navbar />

      <main className="container mx-auto px-6 py-24">
        <Link
          to="/inspirations"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors"
        >
          <ArrowRight size={20} />
          <span>بازگشت به مرکز محتوا</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 flex flex-col gap-6">
            {isVideo && item.video_url ? (
              <VideoEmbed
                url={item.video_url}
                videoType={item.video_type || undefined}
                title={item.title_fa || item.title}
                poster={item.image_url}
              />
            ) : hasBeforeAfter ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {item.before_image_url && (
                  <div className="relative rounded-[2.5rem] overflow-hidden shadow-luxury bg-card">
                    <span className="absolute top-3 right-3 z-10 bg-black/60 text-white text-xs font-bold px-3 py-1 rounded-full">
                      قبل
                    </span>
                    <img
                      src={item.before_image_url}
                      alt="قبل"
                      className="w-full h-full object-cover aspect-[4/5]"
                    />
                  </div>
                )}
                {item.after_image_url && (
                  <div className="relative rounded-[2.5rem] overflow-hidden shadow-luxury bg-card">
                    <span className="absolute top-3 right-3 z-10 bg-primary/80 text-white text-xs font-bold px-3 py-1 rounded-full">
                      بعد
                    </span>
                    <img
                      src={item.after_image_url}
                      alt="بعد"
                      className="w-full h-full object-cover aspect-[4/5]"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="relative rounded-[2.5rem] overflow-hidden shadow-luxury bg-card aspect-[4/5] sm:aspect-video">
                <img
                  src={item.image_url}
                  alt={item.title_fa || item.title}
                  className="w-full h-full object-cover"
                />
                {item.products?.map((p) => (
                  <div
                    key={p.id}
                    className="absolute z-20 group"
                    style={{ left: `${p.x_position}%`, top: `${p.y_position}%` }}
                    onMouseEnter={() => setHoveredProduct(p.product_id)}
                    onMouseLeave={() => setHoveredProduct(null)}
                  >
                    <div className="relative">
                      <div className="w-6 h-6 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer shadow-luxury border border-white/50 animate-pulse">
                        <ShoppingBag size={12} className="text-primary" />
                      </div>
                      <div
                        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 bg-white rounded-xl shadow-2xl p-3 transition-all duration-300 pointer-events-none ${
                          hoveredProduct === p.product_id
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-2"
                        }`}
                      >
                        <img
                          src={p.product?.image_url || ""}
                          className="w-full h-24 object-cover rounded-lg mb-2"
                        />
                        <h4 className="font-bold text-xs text-charcoal line-clamp-1">
                          {p.product?.name}
                        </h4>
                        <p className="text-[10px] text-primary font-bold mt-1">
                          {p.product?.price
                            ? `${p.product.price.toLocaleString()} تومان`
                            : "تماس بگیرید"}
                        </p>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {gallery.length > 0 && (
              <ContentGallery images={gallery} title={item.title_fa || item.title} />
            )}

            {isProjectShowcase && item.designer_name && (
              <div className="bg-card rounded-3xl p-6 border border-border/50 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">طراح پروژه</p>
                  <p className="font-bold">{item.designer_name}</p>
                  {item.completion_time && (
                    <p className="text-xs text-muted-foreground">
                      زمان اجرا: {item.completion_time}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="bg-card rounded-3xl p-8 border border-border/50">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  {typeLabel}
                </Badge>
                {styleLabel && (
                  <Badge variant="outline" className="bg-gold/5 text-gold border-gold/20">
                    {styleLabel}
                  </Badge>
                )}
                {roomLabel && (
                  <Badge variant="outline" className="bg-blue-500/5 text-blue-500 border-blue-500/20">
                    {roomLabel}
                  </Badge>
                )}
                {item.reading_time ? (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock size={12} /> {item.reading_time} دقیقه
                  </Badge>
                ) : null}
              </div>

              <h1 className="text-3xl font-black mb-4">{item.title_fa || item.title}</h1>

              {(item.description_fa || item.description) && (
                <p className="text-muted-foreground text-lg leading-relaxed whitespace-pre-wrap mb-6">
                  {item.description_fa || item.description}
                </p>
              )}

              {item.summary && (
                <div className="bg-muted/30 rounded-2xl p-4 mb-6 border-r-4 border-primary">
                  <p className="text-muted-foreground leading-relaxed">{item.summary}</p>
                </div>
              )}

              {item.budget_range_min || item.budget_range_max ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <span className="font-bold">بودجه:</span>
                  <span>
                    {item.budget_range_min?.toLocaleString() || "۰"} تا{" "}
                    {item.budget_range_max?.toLocaleString() || "不限"} تومان
                  </span>
                </div>
              ) : null}
            </div>

            <DesignCTA />
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-card rounded-3xl p-6 border border-border/50 shadow-sm sticky top-24">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-red-500 transition-colors">
                    <Heart size={20} />
                    <span className="text-sm font-bold">
                      {(item.save_count || 0) + (item.popularity || 0)}
                    </span>
                  </button>
                  <button
                    onClick={handleShare}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Share2 size={20} />
                  </button>
                </div>
                <Button
                  onClick={() => !isSaved && saveInspiration.mutate({ inspirationId: item.id })}
                  className={`rounded-full px-6 font-bold ${isSaved ? "bg-primary" : "gradient-gold"}`}
                >
                  <Bookmark size={18} className={`ml-2 ${isSaved ? "fill-current" : ""}`} />
                  {isSaved ? "ذخیره شد" : "ذخیره"}
                </Button>
              </div>

              <div className="space-y-6">
                {item.video_url && (
                  <a
                    href={item.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <ExternalLink size={16} />
                    <span className="text-sm font-semibold">مشاهده ویدیو در {item.video_type || "منبع"}</span>
                  </a>
                )}

                {materials.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
                      <Info size={16} /> مصالح و متریال
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {materials.map((m: string) => (
                        <span
                          key={m}
                          className="text-xs bg-muted px-3 py-1.5 rounded-lg text-muted-foreground"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {colorPalette.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
                      <Info size={16} /> رنگ‌های پیشنهادی
                    </h4>
                    <div className="flex gap-2 flex-wrap">
                      {colorPalette.map((color: string) => (
                        <div
                          key={color}
                          className="w-8 h-8 rounded-full border border-black/10 shadow-inner"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-muted-foreground mb-3">برچسب‌ها</h4>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag: string) => (
                        <Link
                          key={tag}
                          to={`/inspirations?tag=${tag}`}
                          className="text-xs bg-muted px-3 py-1.5 rounded-lg text-muted-foreground hover:text-primary cursor-pointer transition-colors"
                        >
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {item.source_url && (
                  <div className="pt-6 border-t border-border/50">
                    <h4 className="text-sm font-bold text-muted-foreground mb-3">منبع</h4>
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <span className="text-sm font-semibold">
                        {item.source_name || "منبع اصلی"}
                      </span>
                      <ExternalLink size={14} className="text-muted-foreground group-hover:text-primary" />
                    </a>
                  </div>
                )}

                <div className="pt-6 border-t border-border/50">
                  <Link
                    to="/ai-design"
                    className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/5 to-gold/5 hover:from-primary/10 hover:to-gold/10 transition-colors group border border-primary/10"
                  >
                    <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center">
                      <Sparkles size={16} className="text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold group-hover:text-primary transition-colors">
                        مشاهده در خانه من
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        با هوش مصنوعی طراحی کن
                      </p>
                    </div>
                    <ArrowRight size={16} className="text-primary" />
                  </Link>
                </div>
              </div>
            </div>

            {relatedProducts && relatedProducts.length > 0 && (
              <RelatedProducts products={relatedProducts} />
            )}

            {isCustomerShowcase && (
              <div className="bg-card rounded-3xl p-6 border border-border/50 shadow-sm">
                <h4 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
                  <User size={16} /> ارسال شده توسط مشتری
                </h4>
                <p className="text-xs text-muted-foreground">
                  این محتوا توسط کاربران هومینو به اشتراک گذاشته شده است.
                </p>
              </div>
            )}
          </div>
        </div>

        {relatedItems && relatedItems.length > 0 && (
          <RelatedContent items={relatedItems} />
        )}
      </main>

      <Footer />
    </div>
  );
};

export default InspirationDetail;
