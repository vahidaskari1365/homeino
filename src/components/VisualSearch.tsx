import { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Image as ImageIcon, Loader2, Search, X, Package, Sofa } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ViewInMyRoomButton from "@/components/ViewInMyRoomButton";

interface ProductHit {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
  profile_id: string;
}

interface AnalysisResult {
  search_keywords: string;
  category: string | null;
  style: string | null;
  colors: string[];
  materials: string[];
  visual_description: string;
}

const VisualSearch = ({ onClose }: { onClose: () => void }) => {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ProductHit[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("لطفاً یک تصویر انتخاب کنید");
      return;
    }
    setError(null);
    setProducts([]);
    setAnalysis(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setImageBase64(base64);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (session) headers["Authorization"] = `Bearer ${session.access_token}`;

        const { data, error: invokeError } = await supabase.functions.invoke("visual-search", {
          body: { image_base64: base64 },
          headers,
        });

        if (invokeError) throw new Error(invokeError.message || "خطا در جستجوی تصویری");
        if (!data || data.error) throw new Error(data?.error || "خطا در تحلیل تصویر");

        setProducts((data.products || []) as ProductHit[]);
        setAnalysis(data.analysis as AnalysisResult);
      } catch (e) {
        setError(e instanceof Error ? e.message : "خطا در جستجوی تصویری");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const reset = () => {
    setImageBase64(null);
    setProducts([]);
    setAnalysis(null);
    setError(null);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      {!imageBase64 && !loading && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
          className="border-2 border-dashed border-border hover:border-accent/50 rounded-2xl p-8 text-center cursor-pointer transition-colors"
        >
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-accent/10 flex items-center justify-center">
            <ImageIcon size={24} className="text-accent" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">جستجو با عکس</p>
          <p className="text-xs text-muted-foreground">یک عکس از محصول مورد نظر آپلود کن — هومینو استودیو مشابه‌های آن را پیدا می‌کند</p>
          <input ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center py-8 text-muted-foreground gap-3">
          <Loader2 className="animate-spin" size={28} />
          <p className="text-sm">هومینو استودیو در حال تحلیل تصویر و جستجوی محصولات مشابه...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 text-sm text-destructive flex items-start gap-2">
          <X size={16} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">{error}</p>
            <button onClick={reset} className="text-xs text-accent hover:underline mt-1">تلاش دوباره</button>
          </div>
        </div>
      )}

      {/* Uploaded image preview */}
      {imageBase64 && !loading && (
        <div className="relative rounded-xl overflow-hidden border border-border">
          <img src={imageBase64} alt="جستجوی تصویری" className="w-full h-48 object-contain bg-muted" />
          <button onClick={reset} className="absolute top-2 left-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center border border-border hover:bg-background transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Analysis tags */}
      {analysis && !loading && (
        <div className="space-y-2">
          {analysis.search_keywords && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">تشخیص هومینو استودیو:</span> {analysis.search_keywords}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {analysis.category && (
              <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-semibold">
                {analysis.category}
              </span>
            )}
            {analysis.style && (
              <span className="text-[10px] bg-gold/10 text-gold px-2 py-0.5 rounded-full font-semibold">
                سبک {analysis.style}
              </span>
            )}
            {analysis.colors?.map((c) => (
              <span key={c} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {products.length > 0 && !loading && (
        <div className="space-y-1">
          <p className="text-xs font-bold text-muted-foreground flex items-center gap-1">
            <Package size={14} /> {products.length} محصول مشابه
          </p>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {products.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition group">
                <Link to={`/product/${p.id}`} onClick={onClose} className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded bg-muted overflow-hidden flex-shrink-0">
                    {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    {p.price && <p className="text-xs text-gold">{p.price.toLocaleString("fa-IR")} تومان</p>}
                  </div>
                </Link>
                <ViewInMyRoomButton
                  productId={p.id}
                  productName={p.name}
                  productImage={p.image_url}
                  productPrice={p.price}
                  variant="full"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No results */}
      {!loading && imageBase64 && products.length === 0 && !error && (
        <p className="text-center text-muted-foreground py-4 text-sm">محصول مشابهی یافت نشد. عکس دیگری امتحان کنید.</p>
      )}
    </div>
  );
};

export default VisualSearch;
