"use client";

import { motion } from "framer-motion";
import { Camera, Image as ImageIcon, ShoppingBag } from "lucide-react";
import Link from "next/link";
import Header from "@/components/Header";

export default function Home() {
  return (
    <>
      <Header />
      <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-4xl w-full space-y-12"
      >
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-[#1A365D]">
            خانه رویایی خود را طراحی کنید
          </h1>
          <p className="text-xl text-[#4A5568]">
            با هوش مصنوعی هومینو، فضای خود را به یک اثر هنری تبدیل کنید
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: "عکس خانه", icon: Camera, color: "bg-blue-50", href: "#" },
            { title: "عکس الهام", icon: ImageIcon, color: "bg-amber-50", href: "/visual-search" },
            { title: "انتخاب محصول", icon: ShoppingBag, color: "bg-teal-50", href: "#" },
          ].map((card, index) => (
            <Link href={card.href} key={index} className="block">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`${card.color} p-8 rounded-3xl shadow-sm border border-gray-100 cursor-pointer flex flex-col items-center space-y-4 h-full`}
              >
                <div className="p-4 bg-white rounded-full shadow-sm">
                  <card.icon className="w-8 h-8 text-[#1A365D]" />
                </div>
                <h3 className="text-xl font-semibold">{card.title}</h3>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>
    </main>
    </>
  );
}
