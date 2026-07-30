"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { ImagePlus, Upload, Search, X } from "lucide-react";
import ProductCard from "@/components/ProductCard";

type Stage = "upload" | "processing" | "results";

const mockProducts = [
  { id: 1, title: "مبل راحتی کلاسیک", price: "۱۲,۸۰۰,۰۰۰ تومان", category: "مبل", color: "bg-gradient-to-br from-amber-200 to-amber-300" },
  { id: 2, title: "مبل راحتی مدرن", price: "۱۵,۵۰۰,۰۰۰ تومان", category: "مبل", color: "bg-gradient-to-br from-blue-200 to-blue-300" },
  { id: 3, title: "مبل تختخواب شو", price: "۱۸,۲۰۰,۰۰۰ تومان", category: "مبل", color: "bg-gradient-to-br from-teal-200 to-teal-300" },
  { id: 4, title: "مبل ال مدل اسکاندیناوی", price: "۲۲,۰۰۰,۰۰۰ تومان", category: "مبل", color: "bg-gradient-to-br from-rose-200 to-rose-300" },
  { id: 5, title: "کاناپه پارچه‌ای", price: "۱۰,۵۰۰,۰۰۰ تومان", category: "مبل", color: "bg-gradient-to-br from-violet-200 to-violet-300" },
  { id: 6, title: "مبل استیل سلطنتی", price: "۳۵,۰۰۰,۰۰۰ تومان", category: "مبل", color: "bg-gradient-to-br from-orange-200 to-orange-300" },
];

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-44 bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-16 bg-gray-200 rounded-full" />
        <div className="h-4 w-3/4 bg-gray-200 rounded" />
        <div className="h-6 w-1/2 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

export default function VisualProductSearch() {
  const [stage, setStage] = useState<Stage>("upload");
  const [image, setImage] = useState<string | null>(null);
  const [identifiedCategory, setIdentifiedCategory] = useState("");

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      startProcessing(file);
    }
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      startProcessing(file);
    }
  }, []);

  const startProcessing = (file: File) => {
    const url = URL.createObjectURL(file);
    setImage(url);
    setStage("processing");

    setTimeout(() => {
      setIdentifiedCategory("مبل راحتی");
      setStage("results");
    }, 2000);
  };

  const reset = () => {
    if (image) URL.revokeObjectURL(image);
    setImage(null);
    setIdentifiedCategory("");
    setStage("upload");
  };

  return (
    <section className="w-full max-w-5xl mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10 space-y-3"
      >
        <h2 className="text-3xl font-bold text-[#1A365D]">جستجوی بصری محصولات</h2>
        <p className="text-gray-500 max-w-lg mx-auto">
          عکس یک مبلمان یا وسیله دکوری را آپلود کنید تا محصولات مشابه را از بازارچه به شما نمایش دهیم
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {stage === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="relative border-2 border-dashed border-gray-300 rounded-3xl p-16 text-center hover:border-[#D4AF37] transition-colors bg-white/50 cursor-pointer group"
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-4 pointer-events-none">
              <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                <ImagePlus className="w-10 h-10 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-700">
                  تصویر خود را اینجا رها کنید
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  یا برای انتخاب کلیک کنید
                </p>
              </div>
              <span className="text-xs text-gray-400">فرمت‌های مجاز: JPG, PNG, WebP</span>
            </div>
          </motion.div>
        )}

        {stage === "processing" && image && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="relative rounded-3xl overflow-hidden max-w-md mx-auto shadow-lg border border-gray-100">
              <Image
                src={image}
                alt="آپلود شده"
                width={500}
                height={256}
                unoptimized
                className="w-full h-64 object-cover"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center text-white space-y-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full mx-auto"
                  />
                  <p className="text-lg font-semibold">در حال شناسایی...</p>
                  <p className="text-sm text-white/70">هوش مصنوعی هومینو در حال آنالیز تصویر شماست</p>
                </div>
              </div>
              <button
                onClick={reset}
                className="absolute top-3 left-3 p-2 bg-white/20 backdrop-blur rounded-full hover:bg-white/40 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-400 mb-4">محصولات مشابه در حال جستجو...</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </motion.div>
        )}

        {stage === "results" && image && (
          <motion.div
            key="results"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 shadow-md">
                <Image
                                src={image}
                                alt="تصویر آپلود شده"
                                width={96}
                                height={96}
                                unoptimized
                                className="w-full h-full object-cover"
                              />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                  <Search className="w-4 h-4" />
                  <span>نتیجه جستجوی تصویری</span>
                </div>
                <h3 className="text-xl font-bold text-[#1A365D]">
                  محصولات مشابه <span className="text-[#D4AF37]">{identifiedCategory}</span>
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {mockProducts.length} محصول مشابه در بازارچه هومینو یافت شد
                </p>
              </div>
              <button
                onClick={reset}
                className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-4 h-4" />
                آپلود تصویر جدید
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}