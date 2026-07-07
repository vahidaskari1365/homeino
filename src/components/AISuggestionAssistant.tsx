import { useState } from "react";
import { Sparkles, Loader2, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ROOM_TYPES = [
  { value: "living", label: "نشیمن" },
  { value: "bedroom", label: "اتاق خواب" },
  { value: "kitchen", label: "آشپزخانه" },
  { value: "bathroom", label: "حمام" },
  { value: "office", label: "اتاق کار" },
  { value: "dining", label: "ناهارخوری" },
  { value: "outdoor", label: "فضای باز" },
];

const STYLES = [
  { value: "modern", label: "مدرن" },
  { value: "classic", label: "کلاسیک" },
  { value: "minimalist", label: "مینیمال" },
  { value: "industrial", label: "صنعتی" },
  { value: "scandinavian", label: "اسکاندیناوی" },
  { value: "luxury", label: "لوکس" },
  { value: "bohemian", label: "بوهمی" },
  { value: "japanese", label: "ژاپنی" },
];

const BUDGETS = [
  { value: "low", label: "اقتصادی (تا ۱۰ میلیون)", min: 0, max: 10000000 },
  { value: "mid", label: "متوسط (۱۰ تا ۵۰ میلیون)", min: 10000000, max: 50000000 },
  { value: "high", label: "بالا (۵۰ تا ۱۰۰ میلیون)", min: 50000000, max: 100000000 },
  { value: "premium", label: "لوکس (۱۰۰ میلیون به بالا)", min: 100000000, max: 1000000000 },
];

interface AISuggestionAssistantProps {
  onComplete: (params: { roomType: string; budget: string; style: string; colors: string[] }) => void;
  onBack: () => void;
}

const AISuggestionAssistant = ({ onComplete, onBack }: AISuggestionAssistantProps) => {
  const [roomType, setRoomType] = useState("");
  const [style, setStyle] = useState("");
  const [budget, setBudget] = useState("");
  const [colorInput, setColorInput] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [step, setStep] = useState(0);

  const addColor = () => {
    const c = colorInput.trim();
    if (c && !colors.includes(c)) {
      setColors([...colors, c]);
      setColorInput("");
    }
  };

  const removeColor = (c: string) => setColors(colors.filter((x) => x !== c));

  const canProceed = roomType && style && budget;

  const handleNext = () => {
    if (step < 2) setStep(step + 1);
    else onComplete({ roomType, budget, style, colors });
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2">
        {[0, 1, 2].map((s) => (
          <div
            key={s}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              s === step ? "bg-accent scale-125" : s < step ? "bg-emerald-400" : "bg-border"
            }`}
          />
        ))}
      </div>

      {/* Step 0: Room Type */}
      {step === 0 && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Sparkles size={20} className="text-accent" />
            </div>
            <div>
              <h3 className="font-bold text-base">نوع فضا را انتخاب کنید</h3>
              <p className="text-xs text-muted-foreground">کدام اتاق را می‌خواهید طراحی کنید؟</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ROOM_TYPES.map((rt) => (
              <button
                key={rt.value}
                onClick={() => setRoomType(rt.value)}
                className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                  roomType === rt.value
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border hover:border-accent/40"
                }`}
              >
                {rt.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground px-4 py-2">
              بازگشت
            </button>
            <button
              onClick={handleNext}
              disabled={!roomType}
              className="flex-1 bg-accent text-accent-foreground py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 transition-all"
            >
              بعدی
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Style + Budget */}
      {step === 1 && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Sparkles size={20} className="text-accent" />
            </div>
            <div>
              <h3 className="font-bold text-base">سبک و بودجه</h3>
              <p className="text-xs text-muted-foreground">سبک مورد نظر و بودجه خود را تعیین کنید</p>
            </div>
          </div>

          {/* Style */}
          <div>
            <p className="text-xs font-semibold mb-2">سبک دکوراسیون</p>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  className={`px-4 py-2 rounded-xl border text-xs font-medium transition-all ${
                    style === s.value
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border hover:border-accent/40"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div>
            <p className="text-xs font-semibold mb-2">بودجه</p>
            <div className="space-y-2">
              {BUDGETS.map((b) => (
                <button
                  key={b.value}
                  onClick={() => setBudget(b.value)}
                  className={`w-full text-right p-3 rounded-xl border text-sm transition-all ${
                    budget === b.value
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border hover:border-accent/40"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => setStep(0)} className="text-xs text-muted-foreground hover:text-foreground px-4 py-2">
              قبلی
            </button>
            <button
              onClick={handleNext}
              disabled={!style || !budget}
              className="flex-1 bg-accent text-accent-foreground py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 transition-all"
            >
              بعدی
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Colors + Summary */}
      {step === 2 && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Sparkles size={20} className="text-accent" />
            </div>
            <div>
              <h3 className="font-bold text-base">رنگ‌های دلخواه (اختیاری)</h3>
              <p className="text-xs text-muted-foreground">رنگ‌های مورد نظر را وارد کنید</p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              value={colorInput}
              onChange={(e) => setColorInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addColor(); } }}
              placeholder="مثلاً: طلایی، سفید، چوبی..."
              className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button onClick={addColor} className="px-4 py-2 bg-accent/10 text-accent rounded-xl text-sm font-medium hover:bg-accent/20">
              اضافه
            </button>
          </div>

          {colors.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {colors.map((c) => (
                <Badge key={c} variant="secondary" className="gap-1 text-xs">
                  {c}
                  <button onClick={() => removeColor(c)} className="hover:text-destructive">
                    <X size={10} />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Summary */}
          <div className="bg-accent/5 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-accent">خلاصه انتخاب شما</p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>فضا: {ROOM_TYPES.find((r) => r.value === roomType)?.label}</p>
              <p>سبک: {STYLES.find((s) => s.value === style)?.label}</p>
              <p>بودجه: {BUDGETS.find((b) => b.value === budget)?.label}</p>
              {colors.length > 0 && <p>رنگ‌ها: {colors.join("، ")}</p>}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => setStep(1)} className="text-xs text-muted-foreground hover:text-foreground px-4 py-2">
              قبلی
            </button>
            <button
              onClick={handleNext}
              className="flex-1 bg-accent text-accent-foreground py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles size={16} />
              دریافت پیشنهاد
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AISuggestionAssistant;
