import React from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  lazy?: boolean;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({ src, alt, className, lazy = true, ...props }) => {
  return (
    <img
      src={src}
      alt={alt}
      loading={lazy ? "lazy" : "eager"}
      className={className}
      {...props}
    />
  );
};

export default OptimizedImage;
