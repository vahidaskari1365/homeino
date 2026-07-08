import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONTENT_TYPE_LABELS, ROOM_LABELS, STYLE_LABELS } from "@/types/content-hub";

interface ContentHubFiltersProps {
  contentTypes: string[];
  activeContentType: string;
  onContentTypeChange: (v: string) => void;
  activeStyle: string;
  onStyleChange: (v: string) => void;
  activeRoomType: string;
  onRoomTypeChange: (v: string) => void;
  sort: string;
  onSortChange: (v: "newest" | "popular" | "trending") => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

const ContentHubFilters = ({
  contentTypes,
  activeContentType,
  onContentTypeChange,
  activeStyle,
  onStyleChange,
  activeRoomType,
  onRoomTypeChange,
  sort,
  onSortChange,
  onReset,
  hasActiveFilters,
}: ContentHubFiltersProps) => {
  const allTypes = ["all", ...contentTypes.filter((t) => t && t !== "inspiration")];

  return (
    <div className="flex flex-col gap-6">
      {allTypes.length > 1 && (
        <div className="flex flex-col gap-3">
          <span className="text-sm font-bold text-muted-foreground flex items-center gap-2">
            <Filter size={16} /> نوع محتوا:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onContentTypeChange("all")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeContentType === "all" || activeContentType === ""
                  ? "gradient-gold text-primary-foreground shadow-luxury"
                  : "bg-card border border-border text-muted-foreground hover:border-gold/40"
              }`}
            >
              همه
            </button>
            {allTypes.map((type) => (
              <button
                key={type}
                onClick={() => onContentTypeChange(type)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeContentType === type
                    ? "gradient-gold text-primary-foreground shadow-luxury"
                    : "bg-card border border-border text-muted-foreground hover:border-gold/40"
                }`}
              >
                {CONTENT_TYPE_LABELS[type] || type}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <span className="text-sm font-bold text-muted-foreground flex items-center gap-2">
          <Filter size={16} /> سبک:
        </span>
        <div className="flex flex-wrap gap-2">
          {["all", "modern", "classic", "minimal", "luxury", "traditional", "industrial", "scandinavian", "bohemian"].map(
            (style) => (
              <button
                key={style}
                onClick={() => onStyleChange(style)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeStyle === style
                    ? "gradient-gold text-primary-foreground shadow-luxury"
                    : "bg-card border border-border text-muted-foreground hover:border-gold/40"
                }`}
              >
                {style === "all" ? "همه سبک‌ها" : STYLE_LABELS[style] || style}
              </button>
            )
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-bold text-muted-foreground flex items-center gap-2">
          <Filter size={16} /> فضا:
        </span>
        <div className="flex flex-wrap gap-2">
          {["all", "living", "bedroom", "kitchen", "bathroom", "office", "dining", "outdoor"].map((room) => (
            <button
              key={room}
              onClick={() => onRoomTypeChange(room)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeRoomType === room
                  ? "gradient-gold text-primary-foreground shadow-luxury"
                  : "bg-card border border-border text-muted-foreground hover:border-gold/40"
              }`}
            >
              {room === "all" ? "همه فضاها" : ROOM_LABELS[room] || room}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-bold text-muted-foreground flex items-center gap-2">
          <Filter size={16} /> مرتب‌سازی:
        </span>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "newest", label: "جدیدترین" },
            { value: "popular", label: "محبوب‌ترین" },
            { value: "trending", label: "داغ‌ترین" },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => onSortChange(item.value as "newest" | "popular" | "trending")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                sort === item.value
                  ? "gradient-gold text-primary-foreground shadow-luxury"
                  : "bg-card border border-border text-muted-foreground hover:border-gold/40"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={onReset} className="self-start gap-2">
          <X size={14} /> پاک کردن فیلترها
        </Button>
      )}
    </div>
  );
};

export default ContentHubFilters;
