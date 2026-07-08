import SEO from "@/components/SEO";
import type { ContentHubItem } from "@/types/content-hub";
import { CONTENT_TYPE_LABELS } from "@/types/content-hub";

interface ContentSEOProps {
  item: ContentHubItem;
  isListing?: boolean;
}

const ContentSEO = ({ item, isListing }: ContentSEOProps) => {
  if (isListing) {
    return (
      <SEO
        title="مرکز محتوای هومینو"
        description="مرجع تخصصی دکوراسیون داخلی، راهنمای خرید، ترندهای روز، ایده‌های طراحی و مقالات آموزشی در هومینو"
        keywords="دکوراسیون داخلی, طراحی داخلی, راهنمای خرید, ایده دکوراسیون, ترندهای روز, هومینو"
      />
    );
  }

  const typeLabel = CONTENT_TYPE_LABELS[item.content_type] || "محتوا";
  const title = item.title_fa || item.title || "";
  const description = item.seo_description || item.summary || item.description_fa || item.description || "";
  const canonical = item.canonical_url || undefined;
  const image = item.image_url || "/og-image.png";

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: description,
    image: image,
    datePublished: item.created_at,
    dateModified: item.updated_at || item.created_at,
    author: {
      "@type": "Organization",
      name: "هومینو",
    },
    publisher: {
      "@type": "Organization",
      name: "هومینو",
      logo: {
        "@type": "ImageObject",
        url: "/og-image.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": typeof window !== "undefined" ? window.location.href : "",
    },
  };

  return (
    <SEO
      title={`${title} | ${typeLabel}`}
      description={description.slice(0, 160)}
      ogImage={image}
      ogUrl={typeof window !== "undefined" ? window.location.href : ""}
      jsonLd={jsonLd}
    />
  );
};

export default ContentSEO;
