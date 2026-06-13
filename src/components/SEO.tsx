import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogUrl?: string;
  type?: string;
  jsonLd?: object;
}

const SEO: React.FC<SEOProps> = ({
  title = 'خانه‌زیبا | دکوراسیون و مبلمان',
  description = 'پلتفرم تخصصی دکوراسیون داخلی و خرید مستقیم از تولیدکنندگان',
  keywords = 'دکوراسیون, مبلمان, چیدمان منزل, طراحی داخلی, خرید مستقیم',
  ogImage = '/og-image.png',
  ogUrl = typeof window !== 'undefined' ? window.location.href : '',
  type = 'website',
  jsonLd,
}) => {
  const siteTitle = `${title} | خانه‌زیبا`;

  return (
    <Helmet>
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={ogUrl} />
      <meta property="og:type" content={type} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
