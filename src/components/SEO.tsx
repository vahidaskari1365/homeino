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
  title = 'هومینو | Homeino - مرجع دکوراسیون و لوازم خانه با AI',
  description = 'هومینو - پلتفرم جامع دکوراسیون داخلی: طراحی با هوش مصنوعی، خرید مستقیم از تولیدکنندگان، ست‌های آماده دکوراسیون و مشاوره تخصصی. خانه رویایی‌تان را بسازید.',
  keywords = 'دکوراسیون, مبلمان, چیدمان منزل, طراحی داخلی, هوش مصنوعی, خرید مبلمان, فرش, لوستر, پرده, جهیزیه',
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
