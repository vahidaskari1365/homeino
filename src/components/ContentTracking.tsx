import { useEffect, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { trackEvent } from "@/lib/tracking";
import type { ContentHubItem } from "@/types/content-hub";

interface ContentTrackingProps {
  item: ContentHubItem;
}

const ContentTracking = ({ item }: ContentTrackingProps) => {
  const trackedView = useRef(false);
  const { ref, inView } = useInView({ threshold: 0.3 });
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (inView && !trackedView.current) {
      trackedView.current = true;
      trackEvent("product_viewed" as never, {
        entityType: "content",
        entityId: item.id,
        metadata: {
          content_type: item.content_type,
          title: item.title_fa || item.title,
          style: item.style,
          room_type: item.room_type,
        },
      });
    }
  }, [inView, item.id, item.content_type, item.title_fa, item.title, item.style, item.room_type]);

  useEffect(() => {
    return () => {
      const readTime = Math.round((Date.now() - startTimeRef.current) / 1000);
      if (readTime > 5) {
        trackEvent("product_viewed" as never, {
          entityType: "content_read",
          entityId: item.id,
          metadata: { read_time_seconds: readTime, content_type: item.content_type },
        });
      }
    };
  }, [item.id, item.content_type]);

  return <div ref={ref} className="hidden" />;
};

export default ContentTracking;
