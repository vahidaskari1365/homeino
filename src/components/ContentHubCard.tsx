import { Link } from "react-router-dom";
import { Bookmark, Heart, Clock, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ContentHubItem } from "@/types/content-hub";
import { CONTENT_TYPE_LABELS, STYLE_LABELS, ROOM_LABELS } from "@/types/content-hub";

interface ContentHubCardProps {
  item: ContentHubItem;
  isSaved?: boolean;
  onSave?: (id: string) => void;
}

const ContentHubCard = ({ item, isSaved, onSave }: ContentHubCardProps) => {
  const type = item.content_type || "inspiration";
  const typeLabel = CONTENT_TYPE_LABELS[type] || type;
  const styleLabel = item.style ? (STYLE_LABELS[item.style] || item.style) : null;
  const roomLabel = item.room_type ? (ROOM_LABELS[item.room_type] || item.room_type) : null;
  const isVideo = type === "video" || item.video_url;

  return (
    <Link
      to={`/inspirations/${item.id}`}
      className="group relative w-full aspect-[4/5] rounded-[1.4rem] overflow-hidden bg-card border border-border/50 hover:border-primary/30 shadow-card hover:shadow-luxury transition-all duration-500 hover:-translate-y-1 flex flex-col"
    >
      <img
        src={item.image_url}
        alt={item.title_fa || item.title}
        loading="lazy"
        className="w-full h-full object-cover transition-transform ease-out group-hover:scale-105"
        style={{ transitionDuration: '900ms' }}
      />

      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-4 text-white z-10" />

      <div className="absolute top-3 right-3 left-3 flex items-start justify-between z-20 opacity-0 group-hover:opacity-100 transition-all duration-300">
        <div className="flex flex-wrap gap-1.5">
          {isVideo && (
            <Badge className="bg-red-500/80 backdrop-blur-md border border-red-400/30 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
              <Play size={10} /> ویدیو
            </Badge>
          )}
          <Badge className="bg-white/20 backdrop-blur-md border border-white/10 text-white text-[10px] px-2.5 py-0.5 rounded-full">
            {typeLabel}
          </Badge>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isSaved && onSave) onSave(item.id);
          }}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
            isSaved
              ? "bg-primary text-primary-foreground"
              : "bg-white/90 text-charcoal hover:bg-white"
          }`}
        >
          <Bookmark size={13} className={isSaved ? "fill-current" : ""} />
          {isSaved ? "ذخیره شد" : "ذخیره"}
        </button>
      </div>

      <div className="absolute bottom-3 right-3 left-3 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col gap-1.5 text-white text-right">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          {styleLabel && (
            <span className="text-[10px] bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded-full">
              {styleLabel}
            </span>
          )}
          {roomLabel && (
            <span className="text-[10px] bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded-full">
              {roomLabel}
            </span>
          )}
          {item.reading_time ? (
            <span className="text-[10px] bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1">
              <Clock size={9} /> {item.reading_time} دقیقه
            </span>
          ) : null}
        </div>
        <h3 className="font-bold text-sm leading-snug line-clamp-2">{item.title_fa || item.title}</h3>
        {item.summary ? (
          <p className="text-[11px] text-gray-300 line-clamp-1">{item.summary}</p>
        ) : null}
        <div className="flex items-center justify-between border-t border-white/20 pt-2 mt-1">
          <span className="flex items-center gap-1 text-[11px] text-gray-300">
            <Heart size={12} className="fill-current text-red-400" />
            {(item.save_count || 0) + (item.popularity || 0)} پسند
          </span>
          <span className="text-[10px] bg-primary/90 text-primary-foreground font-bold px-2.5 py-1 rounded-lg">
            مشاهده
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ContentHubCard;
