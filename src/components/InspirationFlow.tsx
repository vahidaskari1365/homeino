import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload, Wand2, Loader2, ArrowRight, Sparkles, X, ShoppingBag, RefreshCw, Heart,
  ArrowUpDown, Home, Image as ImageIcon, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import ObjectSection from "@/components/ObjectSection";
import DesignSummary from "@/components/DesignSummary";
import { useObjectSearch, type ProductMatch } from "@/hooks/useObjectSearch";

interface InspirationFlowProps {
  onProceedToDesign: (products: ProductMatch[], totalPrice: number, roomPhotoBase64?: string | null) => void;
  onBack: () => void;
}

const InspirationFlow = ({ onProceedToDesign, onBack }: InspirationFlowProps) => {
  const objectSearch = useObjectSearch();
  const refInputRef = useRef<HTMLInputElement>(null);
  const roomInputRef = useRef<HTMLInputElement>(null);

  const [roomImageBase64, setRoomImageBase64] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [sortBy, setSortBy] = useState<string>("similarity");

  // Handle reference inspiration image upload
  const handleRefFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("لطفاً یک تصویر معتبر انتخاب کنید");
      return;
    }
    setShowSummary(false);
    await objectSearch.detectAndMatch(file);
  }, [objectSearch]);

  // Handle user's room image upload
  const handleRoomFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("لطفاً یک تصویر معتبر انتخاب کنید");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم عکس بیش از حد مجاز است (حداکثر ۵ مگابایت)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setRoomImageBase64(reader.result as string);
      toast.success("عکس خانه شما با موفقیت بارگذاری شد");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDropRef = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleRefFile(file);
  }, [handleRefFile]);

  const handleDropRoom = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleRoomFile(file);
  }, [handleRoomFile]);

  const selectedCount = objectSearch.getSelectedCount();
  const totalPrice = objectSearch.getTotalPrice();
  const allProducts = objectSearch.objects.flatMap((obj) => obj.matches);

  const handleGoToDesign = () => {
    const products = objectSearch.getSelectedProducts();
    const price = objectSearch.getTotalPrice();
    if (products.length === 0) {
      toast.error("حداقل یک محصول انتخاب کنید");
      return;
    }
    onProceedToDesign(products, price, roomImageBase64);
  };

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────── */}
      <div className="text-center mb-4">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-muted-foreground hover:text-emerald-400 mb-3 text-xs font-bold">
          <ArrowRight size={14} /> بازگشت به منو
        </button>
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <Sparkles size={14} />
          <span className="text-xs font-bold">اسکن هوشمند اشیاء و جایگذاری در عکس خانه شما</span>
        </div>
        <p className="text-muted-foreground text-xs max-w-xl mx-auto leading-relaxed">
          تصویر مدل یا الهام‌بخش خود را بارگذاری کنید. هومینو اشیاء (مبل، میز، لوستر...) را تشخیص داده و معادل آن را در دیتابیس پیدا می‌کند تا مستقیم روی عکس خانه شما جایگذاری نماید.
        </p>
      </div>

      {/* ── Side-by-Side Dual Upload Area ────────────────────────── */}
      {objectSearch.status === "idle" && (
        <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">

          {/* 1. Reference / Inspiration Image Dropzone */}
          <Card
            onClick={() => refInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropRef}
            className="cursor-pointer border-2 border-dashed border-emerald-500/30 hover:border-emerald-400 bg-card/80 transition-all hover:shadow-lg"
          >
            <CardContent className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                <ImageIcon size={22} />
              </div>
              <div>
                <p className="font-extrabold text-sm text-foreground mb-1">۱. تصویر الهام / مدل موردنظر</p>
                <p className="text-[11px] text-muted-foreground">پینترست، اینستاگرام، کاتالوگ یا مدل دلخواه</p>
              </div>
              <div className="flex flex-wrap justify-center gap-1 text-[10px] text-muted-foreground pt-1">
                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">اسکن اشیاء</Badge>
                <Badge variant="outline" className="text-[10px]">یافتن مدل در دیتابیس</Badge>
              </div>
              <input
                ref={refInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleRefFile(e.target.files[0])}
              />
            </CardContent>
          </Card>

          {/* 2. User Room Image Dropzone */}
          <Card
            onClick={() => roomInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropRoom}
            className={`cursor-pointer border-2 border-dashed transition-all hover:shadow-lg ${
              roomImageBase64
                ? "border-emerald-500 bg-emerald-500/5"
                : "border-border hover:border-emerald-500/40 bg-card/80"
            }`}
          >
            <CardContent className="p-6 text-center space-y-3 relative overflow-hidden">
              {roomImageBase64 ? (
                <div className="space-y-2">
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-emerald-500/40 shadow-md">
                    <img src={roomImageBase64} alt="خانه شما" className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setRoomImageBase64(null); }}
                      className="absolute top-2 left-2 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center text-xs hover:bg-background"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <p className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
                    <CheckCircle2 size={13} /> عکس خانه شما بارگذاری شد
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto text-muted-foreground">
                    <Home size={22} />
                  </div>
                  <div>
                    <p className="font-extrabold text-sm text-foreground mb-1">۲. عکس خانه شما (اختیاری)</p>
                    <p className="text-[11px] text-muted-foreground">برای جایگذاری مستقیم محصولات روی اتاق شما</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">چیدمان نهایی</Badge>
                </>
              )}
              <input
                ref={roomInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleRoomFile(e.target.files[0])}
              />
            </CardContent>
          </Card>

        </div>
      )}

      {/* ── Progress States ────────────────────── */}
      {(objectSearch.status === "uploading" || objectSearch.status === "detecting" || objectSearch.status === "matching") && (
        <div className="max-w-md mx-auto space-y-4">
          <Card className="border-emerald-500/30">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <Loader2 size={26} className="animate-spin text-emerald-400" />
              </div>
              <div>
                <p className="font-extrabold text-sm text-foreground">
                  {objectSearch.status === "uploading" && "در حال آپلود تصویر مدل..."}
                  {objectSearch.status === "detecting" && "هومینو استودیو در حال شناسایی مبل، میز، لوستر..."}
                  {objectSearch.status === "matching" && "در حال تطبیق با کاتالوگ دیتابیس هومینو..."}
                </p>
                <p className="text-xs text-muted-foreground mt-1">لطفاً چند لحظه صبر کنید</p>
              </div>
              <Progress
                value={
                  objectSearch.status === "uploading" ? 25 :
                  objectSearch.status === "detecting" ? 60 : 90
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
              <p className="font-bold text-destructive text-sm">خطا در پردازش تصویر</p>
              <p className="text-xs text-muted-foreground">{objectSearch.error}</p>
              <Button variant="outline" size="sm" onClick={objectSearch.reset} className="gap-2 text-xs">
                <RefreshCw size={12} /> تلاش مجدد
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Results: Side-by-Side Reference & Room Photo + Matched Objects ─── */}
      {objectSearch.status === "done" && (
        <div className="space-y-6">
          
          {/* Side-by-Side Images & Analysis */}
          <div className="grid md:grid-cols-2 gap-4">
            
            {/* Left: Reference Model Image */}
            {objectSearch.imageBase64 && (
              <Card className="border-emerald-500/30 bg-card">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-extrabold text-emerald-400 flex items-center gap-1.5">
                      <ImageIcon size={14} /> تصویر مرجع / مدل اولیه
                    </p>
                    <Button variant="ghost" size="sm" onClick={objectSearch.reset} className="h-6 text-xs text-muted-foreground hover:text-foreground">
                      <X size={12} /> تغییر
                    </Button>
                  </div>
                  <div className="aspect-video rounded-xl overflow-hidden bg-muted border border-border">
                    <img src={objectSearch.imageBase64} alt="مدل" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    اشیاء شناسایی شده: <span className="font-bold text-foreground">{objectSearch.objects.length} شیء</span>
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Right: User Room Image Uploader / Preview */}
            <Card className={`bg-card transition-all ${roomImageBase64 ? "border-emerald-500/40" : "border-border"}`}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                    <Home size={14} className="text-emerald-400" /> عکس خانه شما
                  </p>
                  {roomImageBase64 && (
                    <button
                      onClick={() => setRoomImageBase64(null)}
                      className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
                    >
                      <X size={12} /> حذف عکس
                    </button>
                  )}
                </div>

                {roomImageBase64 ? (
                  <div className="aspect-video rounded-xl overflow-hidden bg-muted border border-emerald-500/40 shadow-sm relative">
                    <img src={roomImageBase64} alt="اتاق شما" className="w-full h-full object-cover" />
                    <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur text-emerald-400 text-[10px] px-2 py-0.5 rounded-md font-bold">
                      آماده چیدمان جایگزین
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => roomInputRef.current?.click()}
                    className="aspect-video rounded-xl border-2 border-dashed border-border hover:border-emerald-500/50 bg-muted/30 flex flex-col items-center justify-center p-4 cursor-pointer text-center space-y-2"
                  >
                    <Home size={28} className="text-muted-foreground" />
                    <p className="text-xs font-bold text-foreground">عکس اتاق یا خانه خود را آپلود کنید</p>
                    <p className="text-[10px] text-muted-foreground">تا مدل‌های پیدا شده جایگزین مبل/میز قبلی شما شوند</p>
                    <input
                      ref={roomInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleRoomFile(e.target.files[0])}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Controls bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
            <p className="text-xs font-bold text-foreground">
              مدل‌های پیدا شده در دیتابیس هومینو (برای جایگذاری انتخاب کنید):
            </p>
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] h-8 text-xs border-border">
                  <ArrowUpDown size={12} className="ml-1 text-emerald-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="similarity" className="text-xs">بیشترین شباهت</SelectItem>
                  <SelectItem value="price_asc" className="text-xs">قیمت: کم به زیاد</SelectItem>
                  <SelectItem value="price_desc" className="text-xs">قیمت: زیاد به کم</SelectItem>
                  <SelectItem value="name" className="text-xs">نام محصول</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => objectSearch.saveInspiration?.("الهام جدید")}
                className="gap-1.5 h-8 text-xs border-border"
              >
                <Heart size={12} /> ذخیره الهام
              </Button>
            </div>
          </div>

          {/* Object sections grid */}
          <div className="space-y-3">
            {objectSearch.objects.map((obj, i) => {
              const sel = objectSearch.selections[obj.label];
              if (!sel) return null;
              return (
                <ObjectSection
                  key={obj.label}
                  object={obj}
                  selection={sel}
                  index={i}
                  sortBy={sortBy as "similarity" | "price_asc" | "price_desc" | "name"}
                  onSelect={(product) => objectSearch.selectProduct(obj.label, product)}
                  onSkip={() => objectSearch.skipObject(obj.label)}
                  onClear={() => objectSearch.clearObject(obj.label)}
                />
              );
            })}
          </div>

          {/* Sticky Action Bar */}
          <div className="sticky bottom-6 z-40">
            <Card className="shadow-2xl border-emerald-500/40 bg-card/95 backdrop-blur-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-[11px] text-muted-foreground">انتخاب شده</p>
                      <p className="text-lg font-black text-emerald-400">{selectedCount}</p>
                    </div>
                    <div className="h-8 w-px bg-border" />
                    <div className="text-center">
                      <p className="text-[11px] text-muted-foreground">جمع فاکتور</p>
                      <p className="text-sm font-black text-gold">
                        {totalPrice == null ? "—" : new Intl.NumberFormat("fa-IR").format(totalPrice) + " تومان"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSummary(true)}
                      className="gap-1.5 border-border"
                      disabled={selectedCount === 0}
                    >
                      <ShoppingBag size={14} /> مشاهده لیست
                    </Button>
                    <Button
                      onClick={handleGoToDesign}
                      disabled={selectedCount === 0}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-5 rounded-xl shadow-lg"
                    >
                      <Wand2 size={16} />
                      {roomImageBase64 ? "جایگذاری هوشمند در تصویر خانه من" : "انتقال به محیط چیدمان"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      )}

      {/* Design Summary Modal */}
      <DesignSummary
        selections={objectSearch.selections}
        totalPrice={totalPrice}
        selectedCount={selectedCount}
        onStartDesign={handleGoToDesign}
        onClose={() => setShowSummary(false)}
        open={showSummary}
      />
    </div>
  );
};

export default InspirationFlow;
