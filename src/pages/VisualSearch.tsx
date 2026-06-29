import { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ImageUp,
  Search,
  Sparkles,
  X,
  Package,
  Store,
  Loader2,
  Camera,
  ChevronLeft,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Mock data — simulates AI + marketplace lookup                      */
/* ------------------------------------------------------------------ */
type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  shop: string;
  category: string;
  matchPercent: number;
};

const FURNITURE_CATEGORIES = [
  { id: "sofa", label: "مبل / کاناپه", icon: "🛋️" },
  { id: "table", label: "میز", icon: "🪑" },
  { id: "chair", label: "صندلی", icon: "💺" },
  { id: "bed", label: "تخت خواب", icon: "🛏️" },
  { id: "lamp", label: "چراغ / آباژور", icon: "💡" },
  { id: "shelf", label: "قفسه / کتابخانه", icon: "📚" },
  { id: "cabinet", label: "کمد / کابینت", icon: "🗄️" },
  { id: "decor", label: "دکوری / تابلو", icon: "🖼️" },
];

function generateMockProducts(categoryId: string, count = 8): Product[] {
  const images: Record<string, string[]> = {
    sofa: [
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80",
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400&q=80",
    ],
    table: [
      "https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?w=400&q=80",
      "https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=400&q=80",
    ],
    chair: [
      "https://images.unsplash.com/photo-1503602642458-232111445657?w=400&q=80",
      "https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=400&q=80",
    ],
    bed: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&q=80",
      "https://images.unsplash.com/photo-1505692952047-1a78307d8e9c?w=400&q=80",
    ],
    lamp: [
      "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400&q=80",
      "https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=400&q=80",
    ],
    shelf: [
      "https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=400&q=80",
      "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&q=80",
    ],
    cabinet: [
      "https://images.unsplash.com/photo-1597006335772-25bd937f8b50?w=400&q=80",
      "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&q=80",
    ],
    decor: [
      "https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=400&q=80",
      "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=400&q=80",
    ],
  };
  const cat = FURNITURE_CATEGORIES.find((c) => c.id === categoryId) ?? FURNITURE_CATEGORIES[0];
  const imgPool = images[categoryId] ?? images.sofa;
  const shops = ["چوب و رنگ", "خانه مدرن", "دکوراسیون مهر", "ایده پردازان", "شیک دکور", "سام دکور"];
  return Array.from({ length: count }, (_, i) => ({
    id: `${categoryId}-${i}`,
    name: `${cat.label} ${["شیک", "لوکس", "کلاسیک", "مینیمال", "صنعتی", "اسکاندیناوی", "ایرانی", "طبیعی"][i % 8]}`,
    price: Math.floor(Math.random() * 50_000_000 + 2_000_000),
    image: imgPool[i % imgPool.length],
    shop: shops[i % shops.length],
    category: categoryId,
    matchPercent: Math.floor(Math.random() * 21 + 75),
  }));
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */
const VisualSearch = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [detectedCategory, setDetectedCategory] = useState<string | null>(null);
  const [results, setResults] = useState<Product[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setAnalyzing(false);
    setDetectedCategory(null);
    setResults([]);
  }, []);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setAnalyzing(true);
    setDetectedCategory(null);
    setResults([]);

    // Simulate AI analysis delay
    setTimeout(() => {
      const idx = Math.floor(Math.random() * FURNITURE_CATEGORIES.length);
      const cat = FURNITURE_CATEGORIES[idx];
      setDetectedCategory(cat.id);
      setResults(generateMockProducts(cat.id));
      setAnalyzing(false);
    }, 2200);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  const handleDragLeave = () => setDragging(false);

  const catInfo = FURNITURE_CATEGORIES.find((c) => c.id === detectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-28 pb-16 px-4 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Camera className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-extrabold mb-3">
            جستجوی بصری محصولات
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">
            عکس یک مبلمان یا وسیله دکوراسیون را آپلود کنید تا هوش مصنوعی محصولات مشابه را برایتان پیدا کند
          </p>
        </motion.div>

        {/* Upload zone */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className={cn(
            "relative border-2 border-dashed rounded-3xl p-8 md:p-12 transition-all duration-300 text-center cursor-pointer",
            dragging
              ? "border-primary bg-primary/5 scale-[1.02]"
              : preview
                ? "border-primary/40 bg-muted/20"
                : "border-border hover:border-primary/40 hover:bg-muted/10",
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />

          <AnimatePresence mode="wait">
            {!preview && (
              <motion.div
                key="upload-prompt"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <ImageUp className="w-9 h-9 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-medium mb-1">
                    عکس خود را اینجا بکشید یا کلیک کنید
                  </p>
                  <p className="text-sm text-muted-foreground">
                    فرمت‌های JPEG, PNG, WebP
                  </p>
                </div>
              </motion.div>
            )}

            {preview && !analyzing && !detectedCategory && (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative inline-block max-w-md mx-auto"
              >
                <img
                  src={preview}
                  alt="Uploaded furniture"
                  className="rounded-2xl max-h-80 object-cover shadow-lg"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    reset();
                  }}
                  className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                  aria-label="حذف عکس"
                >
                  <X size={18} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Analysis loading skeleton */}
        <AnimatePresence>
          {analyzing && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="mt-8 space-y-4"
            >
              <div className="flex items-center gap-3 justify-center text-primary">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-medium">هوش مصنوعی در حال آنالیز تصویر...</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-3 w-1/2 rounded" />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Detection result */}
        <AnimatePresence>
          {detectedCategory && !analyzing && (
            <motion.div
              key="detection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-8 text-center"
            >
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 text-primary font-medium mb-6">
                <Sparkles size={18} />
                <span>
                  تشخیص داده شد: <strong>{catInfo?.icon} {catInfo?.label}</strong>
                </span>
              </div>
              <p className="text-muted-foreground mb-6">
                {results.length} محصول مشابه در فروشگاه‌های هومینو
              </p>

              {/* Results grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 text-right">
                {results.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: idx * 0.06 }}
                  >
                    <Link
                      to={`/product/${product.id}`}
                      className="group block rounded-2xl bg-white border border-border overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-white/80 backdrop-blur-sm text-xs font-bold text-primary">
                          %{product.matchPercent} تطابق
                        </div>
                      </div>
                      <div className="p-3.5 space-y-1.5">
                        <h3 className="font-display font-bold text-sm truncate">
                          {product.name}
                        </h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Store size={12} />
                          {product.shop}
                        </p>
                        <p className="text-gold font-bold text-sm">
                          {product.price.toLocaleString("fa-IR")} تومان
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Browse more */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-8"
              >
                <Link
                  to={`/shops?category=${detectedCategory}`}
                  className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline"
                >
                  مشاهده همه محصولات {catInfo?.label}
                  <ChevronLeft size={18} />
                </Link>
              </motion.div>

              {/* Try again */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                onClick={reset}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors text-sm"
              >
                <ImageUp size={16} />
                جستجوی مجدد با عکس دیگر
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category quick pick — shown when idle */}
        {!preview && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-12"
          >
            <h2 className="text-center text-sm font-medium text-muted-foreground mb-4">
              یا یکی از دسته‌بندی‌های زیر را انتخاب کنید
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {FURNITURE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setDetectedCategory(cat.id);
                    setResults(generateMockProducts(cat.id));
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-border shadow-sm hover:border-primary/30 hover:shadow-md transition-all text-sm"
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default VisualSearch;