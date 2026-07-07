// ============================================================
// Homeino — Inspiration Search Page
// ============================================================
// Users upload a reference image from Pinterest, Instagram, etc.
// AI detects furniture and style. Similar Homeino products are
// recommended. Users can select products and "Design My Room".
// ============================================================

import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Upload, Wand2, Loader2, ArrowRight, Search, Image as ImageIcon,
  Sparkles, Palette, Sofa, Layers, X, Check, ShoppingBag,
  Camera, Heart, Filter, ChevronDown, Star, RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/tracking";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ViewInMyRoomButton, { DesignSelectionBar } from "@/components/ViewInMyRoomButton";
import { useVisualSearch, type VisualMatchProduct } from "@/hooks/useVisualSearch";

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("fa-IR").format(n) + " تومان";

const InspirationSearch = () => {
  const navigate = useNavigate();
  const visualSearch = useVisualSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedForDesign, setSelectedForDesign] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"confidence" | "price_asc" | "price_desc" | "newest">("confidence");

  // Handle file upload
  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("لطفاً یک تصویر معتبر انتخاب کنید");
      return;
    }
    setSelectedForDesign([]);
    await visualSearch.uploadAndSearch(file);
  }, [visualSearch]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) handleFile(file);
        break;
      }
    }
  }, [handleFile]);

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  // Start design with selected products
  const handleStartDesign = useCallback(async () => {
    if (selectedForDesign.length === 0) {
      toast.error("حداقل یک محصول انتخاب کنید");
      return;
    }

    const params = new URLSearchParams();
    params.set("products", selectedForDesign.join(","));
    params.set("from", "inspiration");

    trackEvent("ai_started", {
      metadata: {
        source: "inspiration_search",
        product_count: selectedForDesign.length,
        has_reference: !!visualSearch.referenceImageId,
      },
    });

    navigate(`/ai-design?${params.toString()}`);
  }, [selectedForDesign, navigate, visualSearch.referenceImageId]);

  // Filter and sort matches
  const sortedMatches = visualSearch.matches
    .filter((m) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.product_name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.style.toLowerCase().includes(q) ||
        m.store_name?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "confidence": return b.confidence - a.confidence;
        case "price_asc": return (a.price || 0) - (b.price || 0);
        case "price_desc": return (b.price || 0) - (a.price || 0);
        case "newest": return 0; // already sorted by DB
        default: return 0;
      }
    });

  // Pagination
  const [visibleCount, setVisibleCount] = useState(12);
  const visibleMatches = sortedMatches.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {/* ── Header ─────────────────────────────── */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 text-sm">
            <ArrowRight size={16} /> بازگشت به خانه
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-3"
            style={{
              background: "linear-gradient(180deg, hsl(var(--accent)/0.15), hsl(var(--accent)/0.05))",
              border: "1px solid hsl(var(--accent)/0.3)",
            }}>
            <Sparkles size={14} className="text-accent" />
            <span className="text-accent text-xs font-semibold">جستجوی بصری هومینو</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">از هر تصویری ایده بگیر</h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
            یک تصویر از پینترست، اینستاگرام یا گالری آپلود کن — هوش مصنوعی هومینو
            محصولات مشابه را در بازار پیدا می‌کند.
          </p>
        </div>

        {/* ── Upload Area ────────────────────────── */}
        {visualSearch.status === "idle" && (
          <Card
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="max-w-lg mx-auto cursor-pointer border-2 border-dashed border-border hover:border-accent/50 transition-all"
          >
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Upload size={24} className="text-accent" />
              </div>
              <p className="font-semibold mb-1">تصویر الهام خود را آپلود کنید</p>
              <p className="text-xs text-muted-foreground mb-4">
                کلیک کنید یا تصویر را بکشید · Ctrl+V برای چسباندن
              </p>
              <div className="flex flex-wrap justify-center gap-2 text-[10px] text-muted-foreground">
                <Badge variant="outline" className="text-[10px]">پینترست</Badge>
                <Badge variant="outline" className="text-[10px]">اینستاگرام</Badge>
                <Badge variant="outline" className="text-[10px]">گوگل</Badge>
                <Badge variant="outline" className="text-[10px]">دوربین</Badge>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </CardContent>
          </Card>
        )}

        {/* ── Progress States ────────────────────── */}
        {(visualSearch.status === "uploading" || visualSearch.status === "analyzing" || visualSearch.status === "searching") && (
          <div className="max-w-md mx-auto space-y-4">
            <Card>
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                  <Loader2 size={24} className="animate-spin text-accent" />
                </div>
                <div>
                  <p className="font-bold text-sm">
                    {visualSearch.status === "uploading" && "در حال آپلود تصویر..."}
                    {visualSearch.status === "analyzing" && "در حال تحلیل تصویر با هوش مصنوعی..."}
                    {visualSearch.status === "searching" && "در حال جستجوی محصولات مشابه..."}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">لطفاً صبر کنید</p>
                </div>
                <Progress
                  value={
                    visualSearch.status === "uploading" ? 25 :
                    visualSearch.status === "analyzing" ? 55 : 85
                  }
                  className="h-2"
                />
              </CardContent>
            </Card>
            {visualSearch.imageUrl && (
              <div className="w-24 h-24 rounded-xl overflow-hidden mx-auto border border-border">
                <img src={visualSearch.imageUrl} alt="reference" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        )}

        {/* ── Error State ────────────────────────── */}
        {visualSearch.status === "error" && (
          <div className="max-w-md mx-auto">
            <Card className="border-destructive/30">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                  <X size={20} className="text-destructive" />
                </div>
                <p className="font-bold text-destructive">خطا در پردازش تصویر</p>
                <p className="text-xs text-muted-foreground">{visualSearch.error}</p>
                <Button variant="outline" onClick={visualSearch.reset} className="gap-2">
                  <RefreshCw size={14} /> تلاش مجدد
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Results ────────────────────────────── */}
        {visualSearch.status === "done" && (
          <div className="space-y-6">
            {/* Image + Analysis Row */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Reference Image */}
              {visualSearch.imageUrl && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-muted-foreground">تصویر مرجع</p>
                      <Button variant="ghost" size="sm" onClick={visualSearch.reset} className="h-7 text-xs gap-1">
                        <X size={12} /> حذف
                      </Button>
                    </div>
                    <div className="aspect-video rounded-xl overflow-hidden bg-muted">
                      <img src={visualSearch.imageUrl} alt="مرجع" className="w-full h-full object-cover" />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Analysis */}
              {visualSearch.analysis && (
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <p className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                      <Sparkles size={14} className="text-accent" /> تحلیل هوش مصنوعی
                    </p>

                    {/* Detected Style */}
                    {visualSearch.analysis.style && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">سبک تشخیص داده شده</p>
                        <Badge variant="outline" className="bg-accent/10 text-accent">
                          {visualSearch.analysis.style === "modern" ? "مدرن" :
                           visualSearch.analysis.style === "classic" ? "کلاسیک" :
                           visualSearch.analysis.style === "minimalist" ? "مینیمال" :
                           visualSearch.analysis.style === "industrial" ? "صنعتی" :
                           visualSearch.analysis.style === "scandinavian" ? "اسکاندیناوی" :
                           visualSearch.analysis.style === "luxury" ? "لوکس" :
                           visualSearch.analysis.style === "bohemian" ? "بوهمی" :
                           visualSearch.analysis.style}
                        </Badge>
                      </div>
                    )}

                    {/* Detected Objects */}
                    {visualSearch.analysis.objects.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">اشیاء تشخیص داده شده</p>
                        <div className="flex flex-wrap gap-1.5">
                          {visualSearch.analysis.objects.map((obj, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">
                              {obj.furniture}
                              <span className="mr-1 opacity-60">
                                {Math.round(obj.confidence * 100)}%
                              </span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Colors */}
                    {visualSearch.analysis.colors.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">رنگ‌های تشخیص داده شده</p>
                        <div className="flex gap-2 flex-wrap">
                          {visualSearch.analysis.colors.map((color, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs">
                              <div
                                className="w-4 h-4 rounded-full border border-border"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-muted-foreground">{color}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Materials */}
                    {visualSearch.analysis.materials.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">متریال‌ها</p>
                        <div className="flex flex-wrap gap-1.5">
                          {visualSearch.analysis.materials.map((m, i) => (
                            <Badge key={i} variant="outline" className="text-[10px]">{m}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Controls: Search, Sort, Save */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-xs w-full">
                <div className="relative w-full">
                  <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="جستجو در نتایج..."
                    className="pr-9 h-9 text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-9 rounded-lg border border-border bg-card px-3 text-xs outline-none focus:border-accent"
                >
                  <option value="confidence">بیشترین شباهت</option>
                  <option value="price_asc">قیمت: کم به زیاد</option>
                  <option value="price_desc">قیمت: زیاد به کم</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => visualSearch.saveInspiration("الهام جدید")}
                  className="gap-1.5 h-9 text-xs"
                  disabled={!visualSearch.referenceImageId}
                >
                  <Heart size={12} /> ذخیره الهام
                </Button>
              </div>
            </div>

            {/* Result Count */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {sortedMatches.length} محصول مشابه پیدا شد
              </p>
              {selectedForDesign.length > 0 && (
                <p className="text-xs font-bold text-accent">
                  {selectedForDesign.length} محصول برای طراحی انتخاب شده
                </p>
              )}
            </div>

            {/* Products Grid */}
            {visibleMatches.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon size={40} className="mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">محصول مشابهی یافت نشد</p>
                <p className="text-xs text-muted-foreground mt-1">
                  محصولات نزدیک‌تر در بازار هومینو نمایش داده می‌شوند
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {visibleMatches.map((match) => {
                  const isSelected = selectedForDesign.includes(match.product_id);
                  return (
                    <Card
                      key={match.product_id}
                      className={`group relative overflow-hidden transition-all hover:shadow-lg ${
                        isSelected ? "ring-2 ring-accent border-accent" : "border-border"
                      }`}
                    >
                      {/* Similarity Badge */}
                      <div className="absolute top-2 right-2 z-10">
                        <Badge className={`text-[10px] ${
                          match.confidence >= 80 ? "bg-emerald-500" :
                          match.confidence >= 60 ? "bg-amber-500" : "bg-blue-500"
                        } text-white`}>
                          <Star size={8} className="ml-0.5" />
                          {Math.round(match.confidence)}%
                        </Badge>
                      </div>

                      {/* Select for design */}
                      <div className="absolute top-2 left-2 z-10">
                        <Button
                          variant={isSelected ? "default" : "outline"}
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedForDesign((prev) =>
                              isSelected
                                ? prev.filter((id) => id !== match.product_id)
                                : [...prev, match.product_id]
                            );
                          }}
                        >
                          {isSelected ? <Check size={12} /> : <PlusIcon size={12} />}
                        </Button>
                      </div>

                      <Link to={`/product/${match.product_id}`}>
                        <div className="aspect-square bg-muted overflow-hidden">
                          {match.image_url && (
                            <img
                              src={match.image_url}
                              alt={match.product_name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          )}
                        </div>
                      </Link>

                      <CardContent className="p-2.5 space-y-1.5">
                        <Link to={`/product/${match.product_id}`}>
                          <p className="text-xs font-medium line-clamp-1 hover:text-accent transition-colors">
                            {match.product_name}
                          </p>
                        </Link>
                        <p className="text-xs text-accent font-bold">{fmt(match.price)}</p>
                        {match.store_name && (
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{match.store_name}</p>
                        )}
                        {match.match_reason && (
                          <Badge variant="outline" className="text-[9px] bg-muted/50">
                            {match.match_reason}
                          </Badge>
                        )}
                        <div className="pt-1">
                          <ViewInMyRoomButton
                            productId={match.product_id}
                            productName={match.product_name}
                            variant="ghost"
                            size="sm"
                            className="w-full text-[10px] h-7"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Load More */}
            {visibleCount < sortedMatches.length && (
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount((prev) => prev + 12)}
                  className="gap-2"
                >
                  <ChevronDown size={14} /> نمایش بیشتر ({sortedMatches.length - visibleCount} باقیمانده)
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="h-24" />
      </main>

      {/* Design Selection Bar */}
      <DesignSelectionBar
        selectedIds={selectedForDesign}
        onStartDesign={handleStartDesign}
      />

      <Footer />
    </div>
  );
};

// PlusIcon inline component
const PlusIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export default InspirationSearch;