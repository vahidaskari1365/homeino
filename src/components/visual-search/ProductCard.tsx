'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { Product } from '@/types/marketplace';

interface ProductCardProps {
  product: Product;
  index: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, index }) => {
  // Format price with Persian digits and commas
  const formatPrice = (price: number) => {
    return price.toLocaleString('fa-IR') + ' تومان';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group overflow-hidden rounded-2xl bg-white shadow-md transition-all hover:shadow-xl"
    >
      <div className="relative h-64 w-full overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      
      <div className="p-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">{product.name}</h3>
          <span className="rounded-full bg-secondary/10 px-2 py-1 text-xs text-secondary">
            {product.category === 'sofa' && 'مبل'}
            {product.category === 'chair' && 'صندلی'}
            {product.category === 'table' && 'میز'}
            {product.category === 'lamp' && 'آباژور'}
            {product.category === 'rug' && 'فرش'}
          </span>
        </div>
        
        <p className="mb-4 line-clamp-2 text-sm text-gray-500">
          {product.description}
        </p>
        
        <div className="flex items-center justify-between">
          <span className="text-lg font-black text-primary">
            {formatPrice(product.price)}
          </span>
          <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-white transition-colors hover:bg-primary/90">
            <ShoppingCart size={16} />
            مشاهده
          </button>
        </div>
      </div>
    </motion.div>
  );
};
