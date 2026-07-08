import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ContentGalleryProps {
  images: string[];
  title?: string;
}

const ContentGallery = ({ images, title }: ContentGalleryProps) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setLightboxIndex(i)}
            className={`relative rounded-xl overflow-hidden bg-card border border-border/50 group ${
              i === 0 ? "col-span-2 row-span-2" : ""
            }`}
          >
            <img
              src={img}
              alt={`${title || "گالری"} ${i + 1}`}
              className="w-full h-full object-cover aspect-square transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-6 left-6 text-white/80 hover:text-white transition-colors z-10"
          >
            <X size={28} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((prev) =>
                prev !== null ? (prev === 0 ? images.length - 1 : prev - 1) : null
              );
            }}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors z-10"
          >
            <ChevronRight size={36} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((prev) =>
                prev !== null ? (prev === images.length - 1 ? 0 : prev + 1) : null
              );
            }}
            className="absolute left-6 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors z-10"
          >
            <ChevronLeft size={36} />
          </button>

          <img
            src={images[lightboxIndex]}
            alt={`${title || "گالری"} ${lightboxIndex + 1}`}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            {lightboxIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
};

export default ContentGallery;
