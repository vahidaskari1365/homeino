'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Sparkles } from 'lucide-react';
import { ImageUploader } from '@/components/visual-search/ImageUploader';
import { AnalysisOverlay } from '@/components/visual-search/AnalysisOverlay';
import { ProductCard } from '@/components/visual-search/ProductCard';
import { ProductSkeleton } from '@/components/visual-search/ProductSkeleton';
import { mockProducts } from '@/data/mockProducts';
import { SearchState, Product } from '@/types/marketplace';

export default function VisualSearchPage() {
  const [state, setState] = useState<SearchState>('IDLE');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [results, setResults] = useState<Product[]>([]);

  const handleImageUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setState('UPLOADING');

    // Simulate upload delay
    setTimeout(() => {
      setState('ANALYZING');
    }, 1500);
  };

  useEffect(() => {
    if (state === 'ANALYZING') {
      // Simulate AI analysis delay
      const timer = setTimeout(() => {
        // Randomly pick a category to "identify"
        const categories: Product['category'][] = ['sofa', 'chair', 'table', 'lamp', 'rug'];
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        
        const filtered = mockProducts.filter(p => p.category === randomCategory);
        setResults(filtered);
        setState('RESULTS');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  const reset = () => {
    setState('IDLE');
    setPreviewUrl(null);
    setResults([]);
  };

  return (
    <main className="min-h-screen bg-[#FDFBF7] py-12 pt-24" dir="rtl">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-black text-primary mb-4"
          >
            جستجوی بصری محصولات
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-600 max-w-2xl mx-auto"
          >
            تصویری از مبلمان یا دکوراسیون مورد نظر خود را آپلود کنید تا هوش مصنوعی هومینو 
            مشابه آن را در بازار برای شما پیدا کند.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Upload Section */}
          <div className={`transition-all duration-500 ease-in-out ${state === 'RESULTS' ? 'lg:col-span-4' : 'lg:col-span-12 max-w-3xl mx-auto w-full'}`}>
            <AnimatePresence mode="wait">
              {state === 'IDLE' ? (
                <ImageUploader key="uploader" onImageUpload={handleImageUpload} />
              ) : (
                <motion.div 
                  key="preview"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative overflow-hidden rounded-2xl bg-white shadow-xl border-4 border-white aspect-square lg:aspect-auto lg:h-[500px]"
                >
                  {previewUrl && (
                    <Image 
                      src={previewUrl} 
                      alt="Preview" 
                      fill 
                      className="object-cover"
                    />
                  )}
                  
                  {state === 'ANALYZING' && <AnalysisOverlay />}
                  
                  {state === 'UPLOADING' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-4 text-white">
                        <RefreshCw className="animate-spin" size={48} />
                        <span className="text-xl font-bold">در حال بارگذاری...</span>
                      </div>
                    </div>
                  )}

                  {state === 'RESULTS' && (
                    <button 
                      onClick={reset}
                      className="absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-full bg-white px-6 py-2 font-bold text-primary shadow-lg transition-transform hover:scale-105"
                    >
                      <RefreshCw size={18} />
                      جستجوی مجدد
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Results Section */}
          {(state === 'ANALYZING' || state === 'RESULTS') && (
            <div className="lg:col-span-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-secondary" />
                  <h2 className="text-2xl font-black text-primary">
                    {state === 'ANALYZING' ? 'در حال تحلیل تصویر...' : 'نتایج یافت شده'}
                  </h2>
                </div>
                {state === 'RESULTS' && (
                  <span className="text-sm text-gray-500">
                    {results.length.toLocaleString('fa-IR')} محصول مشابه پیدا شد
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {state === 'ANALYZING' ? (
                  Array(4).fill(0).map((_, i) => <ProductSkeleton key={i} />)
                ) : (
                  results.map((product, index) => (
                    <ProductCard key={product.id} product={product} index={index} />
                  ))
                )}
              </div>
              
              {state === 'RESULTS' && results.length === 0 && (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                  <p className="text-gray-500">متاسفانه محصول مشابهی پیدا نشد.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
