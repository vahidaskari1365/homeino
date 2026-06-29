"use client";

import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";

interface Product {
  id: number;
  title: string;
  price: string;
  category: string;
  color: string;
}

export default function ProductCard({ product, index }: { product: Product; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer"
    >
      <div
        className={`h-44 ${product.color} flex items-center justify-center relative overflow-hidden`}
      >
        <div className="w-20 h-20 rounded-full bg-white/30 flex items-center justify-center">
          <ShoppingCart className="w-10 h-10 text-white" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="p-4 space-y-2">
        <span className="text-xs font-medium text-[#D4AF37] bg-amber-50 px-2 py-1 rounded-full">
          {product.category}
        </span>
        <h3 className="font-semibold text-gray-800 text-sm leading-tight">{product.title}</h3>
        <div className="flex items-center justify-between">
          <span className="text-[#1A365D] font-bold text-lg">{product.price}</span>
          <button className="p-2 rounded-full bg-[#1A365D] text-white hover:bg-[#1A365D]/90 transition-colors">
            <ShoppingCart className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}