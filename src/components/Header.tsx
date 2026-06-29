"use client";

import { User, Menu } from "lucide-react";
import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Menu className="w-6 h-6 md:hidden text-gray-600" />
          <Link href="/" className="text-2xl font-bold text-[#1A365D]">
            هومینو <span className="text-[#D4AF37]">استودیو</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <Link href="/" className="hover:text-[#1A365D] transition-colors">خانه</Link>
          <Link href="/projects" className="hover:text-[#1A365D] transition-colors">پروژه‌ها</Link>
          <Link href="/visual-search" className="hover:text-[#1A365D] transition-colors">جستجوی بصری</Link>
          <Link href="/community" className="hover:text-[#1A365D] transition-colors">جامعه</Link>
          <Link href="/designer" className="text-[#D4AF37] hover:opacity-80 transition-opacity">حالت طراح</Link>
        </nav>

        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <User className="w-6 h-6 text-[#1A365D]" />
          </button>
        </div>
      </div>
    </header>
  );
}
