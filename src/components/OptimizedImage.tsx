import React from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  lazy?: boolean;
  width?: number;
  height?: number;
  quality?: number;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({ 
  src, 
  alt, 
  className, 
  lazy = true, 
  width,
  height,
  quality = 80,
  ...props 
}) => {
  const isSupabaseImage = src.includes('supabase.co/storage/v1/object/public/');
  
  let optimizedSrc = src;
  
  if (isSupabaseImage) {
    // If it's a supabase image, we can use their transformation service
    // Note: This requires a Pro plan on Supabase, but it's the standard way
    const urlParts = src.split('/storage/v1/object/public/');
    if (urlParts.length === 2) {
      const baseUrl = urlParts[0];
      const bucketAndPath = urlParts[1];
      
      const params = new URLSearchParams();
      params.append('format', 'webp');
      params.append('quality', quality.toString());
      if (width) params.append('width', width.toString());
      if (height) params.append('height', height.toString());
      
      optimizedSrc = `${baseUrl}/storage/v1/render/image/public/${bucketAndPath}?${params.toString()}`;
    }
  }

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      loading={lazy ? "lazy" : "eager"}
      className={className}
      {...props}
    />
  );
};

export default OptimizedImage;
