import { Link } from "react-router-dom";
import type { ContentHubItem } from "@/types/content-hub";
import { CONTENT_TYPE_LABELS } from "@/types/content-hub";

interface RelatedContentProps {
  items: ContentHubItem[];
  title?: string;
}

const RelatedContent = ({ items, title = "مطالب مرتبط" }: RelatedContentProps) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="mt-24">
      <h2 className="text-2xl font-bold mb-8">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {items.slice(0, 4).map((item) => (
          <Link
            key={item.id}
            to={`/inspirations/${item.id}`}
            className="group relative aspect-[4/5] rounded-2xl overflow-hidden shadow-md"
          >
            <img
              src={item.image_url}
              alt={item.title_fa || item.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
              <span className="text-[10px] text-white/80 mb-1">
                {CONTENT_TYPE_LABELS[item.content_type] || item.content_type}
              </span>
              <h4 className="text-white font-bold text-sm leading-snug line-clamp-2">
                {item.title_fa || item.title}
              </h4>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RelatedContent;
