import { Play } from "lucide-react";

interface VideoEmbedProps {
  url: string;
  videoType?: string;
  title?: string;
  poster?: string;
}

const VideoEmbed = ({ url, videoType, title, poster }: VideoEmbedProps) => {
  const getEmbedUrl = () => {
    if (videoType === "youtube") {
      const match = url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/
      );
      if (match) return `https://www.youtube.com/embed/${match[1]}`;
    }
    if (videoType === "instagram") {
      const match = url.match(/instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)/);
      if (match) return `https://www.instagram.com/p/${match[1]}/embed/`;
    }
    if (url.includes("aparat.com")) {
      const match = url.match(/aparat\.com\/v\/([a-zA-Z0-9_-]+)/);
      if (match) return `https://www.aparat.com/video/video/embed/videohash/${match[1]}/vt/frame`;
    }
    return url;
  };

  const embedUrl = getEmbedUrl();
  const isEmbeddable = embedUrl !== url || url.includes("embed");

  if (!isEmbeddable) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block rounded-2xl overflow-hidden bg-card aspect-video group"
      >
        {poster && (
          <img src={poster} alt={title || ""} className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-luxury group-hover:scale-110 transition-transform">
            <Play size={28} className="text-primary mr-1" />
          </div>
        </div>
        {title && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-white font-bold text-sm">{title}</p>
          </div>
        )}
      </a>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-card aspect-video shadow-md">
      <iframe
        src={embedUrl}
        title={title || "Video"}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
};

export default VideoEmbed;
