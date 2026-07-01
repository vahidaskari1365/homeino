import { useEffect, useRef } from "react";
import { Sparkles, Type } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIPromptBoxProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  className?: string;
}

const SUGGESTIONS = [
  "فضای گرم و صمیمی",
  "سبک لوکس و مجلل",
  "مناسب برای کودکان",
  "دکوراسیون مینیمال",
  "نورپردازی طبیعی",
  "سبک مدرن و ساده",
  "رنگ‌های روشن و شاد",
  "فضای دنج و آرامش‌بخش",
];

export default function AIPromptBox({
  value,
  onChange,
  maxLength = 500,
  placeholder = "توصیف کنید چه فضایی می‌خواهید... مثلاً: فضای گرم با نور طبیعی، مبل راحتی کرم رنگ، میز چوبی قهوه‌ای",
  className,
}: AIPromptBoxProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 240) + "px";
    }
  };

  useEffect(() => {
    autoResize();
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= maxLength) {
      onChange(val);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    const separator = value.trim() ? "، " : "";
    const newVal = value + separator + suggestion;
    if (newVal.length <= maxLength) {
      onChange(newVal);
    }
  };

  const charsLeft = maxLength - value.length;

  return (
    <div className={cn("w-full", className)}>
      {/* Label */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100">
          <Sparkles size={20} className="text-indigo-500" />
          توضیحات تکمیلی
        </h2>
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          (اختیاری)
        </span>
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          rows={3}
          className="w-full resize-none rounded-xl border border-gray-200 bg-white p-4 pb-10 text-sm leading-relaxed text-gray-800 outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/30"
          dir="rtl"
        />

        {/* Character Counter */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {value.length === 0 &&
              SUGGESTIONS.slice(0, 4).map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestionClick(s)}
                  className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[10px] text-gray-500 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
                >
                  {s}
                </button>
              ))}
          </div>
          <span
            className={cn(
              "flex-shrink-0 text-[10px] transition-colors",
              charsLeft <= 20
                ? "text-red-500 font-bold"
                : charsLeft <= 50
                  ? "text-amber-500"
                  : "text-gray-400 dark:text-gray-500",
            )}
          >
            <Type size={10} className="ml-0.5 inline" />
            {charsLeft.toLocaleString("fa-IR")}
          </span>
        </div>
      </div>

      {/* Suggestion chips (shown when there's text) */}
      {value.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] text-gray-400 dark:text-gray-500">
            افزودن المان‌های بیشتر:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestionClick(s)}
                className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[10px] text-gray-500 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}