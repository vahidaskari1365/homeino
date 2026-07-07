import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Upload, Wand2, Loader2, ArrowRight, Search, Image as ImageIcon,
  Sparkles, Sofa, Layers, X, Check, ShoppingBag,
  Camera, Heart, RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import ObjectSection from "@/components/ObjectSection";
import DesignSummary from "@/components/DesignSummary";
import ViewInMyRoomButton from "@/components/ViewInMyRoomButton";
import { useObjectSearch, type DetectedObject, type ProductMatch } from "@/hooks/useObjectSearch";
import { useVisualSearch, type VisualMatchProduct } from "@/hooks/useVisualSearch";

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("fa-IR").format(n) + " تومان";

const InspirationSearch = () => {
  const navigate = useNavigate();
  const objectSearch = useObjectSearch();
  const visualSearch = useVisualSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"objects" | "flat">("objects");
  const [showSummary, setShowSummary] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("لطفاً یک تصویر معتبر انتخاب کنید");
      return;
    }
    setShowSummary(false);
    await objectSearch.detectAndMatch(file);
  }, [objectSearch]);

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

  const selectedCount = objectSearch.getSelectedCount();
  const totalPrice = objectSearch.getTotalPrice();
  const allProducts = objectSearch.objects.flatMap((obj) => obj.matches);

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
            <span className="text-accent text-xs font-semibold">جستجوی بصری هوشمند هومینو</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">اشیاء را شناسایی کن، محصولات را انتخاب کن</h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
            یک تصویر از پینترست، اینستاگرام یا گالری آپلود کن — هوش مصنوعی تک‌تک اشیاء دکوراسیون را تشخیص می‌دهد
            و برای هر کدام نزدیک‌ترین محصولات هومینو را پیشنهاد می‌کند.
          </p>
        </div>

        {/* ── Upload Area ────────────────────────── */}
        {objectSearch.status === "idle" && (
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
        {(objectSearch.status === "uploading" || objectSearch.status === "detecting" || objectSearch.status === "matching") && (
          <div className="max-w-md mx-auto space-y-4">
            <Card>
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                  <Loader2 size={24} className="animate-spin text-accent" />
                </div>
                <div>
                  <p className="font-bold text-sm">
                    {objectSearch.status === "uploading" && "در حال آپلود تصویر..."}
                    {objectSearch.status === "detecting" && "هوش مصنوعی در حال شناسایی اشیاء..."}
                    {objectSearch.status === "matching" && "در حال جستجوی محصولات مشابه برای هر شیء..."}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">لطفاً صبر کنید</p>
                </div>
                <Progress
                  value={
                    objectSearch.status === "uploading" ? 20 :
                    objectSearch.status === "detecting" ? 50 : 80
                  }
                  className="h-2"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Error State ────────────────────────── */}
        {objectSearch.status === "error" && (
          <div className="max-w-md mx-auto">
            <Card className="border-destructive/30">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                  <X size={20} className="text-destructive" />
                </div>
                <p className="font-bold text-destructive">خطا در پردازش تصویر</p>
                <p className="text-xs text-muted-foreground">{objectSearch.error}</p>
                <Button variant="outline" onClick={objectSearch.reset} className="gap-2">
                  <RefreshCw size={14} /> تلاش مجدد
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Results: Object-Level View ─────────── */}
        {objectSearch.status === "done" && (
          <div className="space-y-6">
            {/* Image + Overall Analysis Row */}
            <div className="grid md:grid-cols-2 gap-6">
              {objectSearch.imageBase64 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-muted-foreground">تصویر مرجع</p>
                      <Button variant="ghost" size="sm" onClick={objectSearch.reset} className="h-7 text-xs gap-1">
                        <X size={12} /> حذف
                      </Button>
                    </div>
                    <div className="aspect-video rounded-xl overflow-hidden bg-muted">
                      <img src={objectSearch.imageBase64} alt="مرجع" className="w-full h-full object-cover" />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Analysis summary */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                    <Sparkles size={14} className="text-accent" /> تحلیل هوش مصنوعی
                  </p>
                  {objectSearch.overallStyle && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">سبک کلی فضا</p>
                      <Badge variant="outline" className="bg-accent/10 text-accent text-[10px]">
                        {objectSearch.overallStyle === "modern" ? "مدرن" :
                         objectSearch.overallStyle === "classic" ? "کلاسیک" :
                         objectSearch.overallStyle === "minimalist" ? "مینیمال" :
                         objectSearch.overallStyle === "industrial" ? "صنعتی" :
                         objectSearch.overallStyle === "scandinavian" ? "اسکاندیناوی" :
                         objectSearch.overallStyle === "luxury" ? "لوکس" :
                         objectSearch.overallStyle === "bohemian" ? "بوهمی" :
                         objectSearch.overallStyle}
                      </Badge>
                    </div>
                  )}
                  {objectSearch.roomType && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">نوع فضا</p>
                      <span className="text-xs font-medium">
                        {objectSearch.roomType === "living" ? "نشیمن" :
                         objectSearch.roomType === "bedroom" ? "اتاق خواب" :
                         objectSearch.roomType === "kitchen" ? "آشپزخانه" :
                         objectSearch.roomType === "bathroom" ? "حمام" :
                         objectSearch.roomType === "dining" ? "ناهارخوری" :
                         objectSearch.roomType === "office" ? "اتاق کار" :
                         objectSearch.roomType}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-muted-foreground">اشیاء تشخیص داده شده</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {objectSearch.objects.map((obj, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">
                          {obj.label}
                          <span className="mr-1 opacity-60">{Math.round(obj.confidence * 100)}%</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {objectSearch.objects.length} شیء · {allProducts.length} محصول مشابه
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                برای هر شیء، بهترین محصولات هومینو را انتخاب کنید
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => objectSearch.saveInspiration?.("الهام جدید")}
                className="gap-1.5 h-8 text-xs"
              >
                <Heart size={12} /> ذخیره الهام
              </Button>
            </div>

            {/* Object sections */}
            <div className="space-y-4">
              {objectSearch.objects.map((obj, i) => {
                const sel = objectSearch.selections[obj.label];
                if (!sel) return null;
                return (
                  <ObjectSection
                    key={obj.label}
                    object={obj}
                    selection={sel}
                    index={i}
                    onSelect={(product) => objectSearch.selectProduct(obj.label, product)}
                    onSkip={() => objectSearch.skipObject(obj.label)}
                    onRemove={() => objectSearch.removeObject(obj.label)}
                  />
                );
              })}
            </div>

            {/* Floating action bar */}
            {objectSearch.status === "done" && (
              <div className="sticky bottom-6 z-40">
                <Card className="shadow-xl border-accent/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">انتخاب شده</p>
                          <p className="text-lg font-black text-accent">{selectedCount}</p>
                        </div>
                        <div className="h-10 w-px bg-border" />
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">جمع قیمت</p>
                          <p className="text-sm font-black text-accent">{fmt(totalPrice)}</p>
                        </div>
                        <div className="h-10 w-px bg-border" />
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">تشخیص داده شده</p>
                          <p className="text-sm font-black text-foreground">{objectSearch.objects.length}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowSummary(true)}
                          className="gap-1.5"
                          disabled={selectedCount === 0}
                        >
                          <ShoppingBag size={14} /> مشاهده مجموعه
                        </Button>
                        <Button
                          onClick={() => objectSearch.goToDesign()}
                          disabled={selectedCount === 0}
                          className="gap-2"
                        >
                          <Wand2 size={16} />
                          طراحی با AI
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Design Summary Modal */}
      <DesignSummary
        selections={objectSearch.selections}
        totalPrice={totalPrice}
        selectedCount={selectedCount}
        onStartDesign={() => { setShowSummary(false); objectSearch.goToDesign(); }}
        onClose={() => setShowSummary(false)}
        open={showSummary}
      />

      <Footer />
    </div>
  );
};

export default InspirationSearch;
