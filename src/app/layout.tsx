import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const vazirmatn = localFont({
  src: [
    {
      path: "../../node_modules/vazirmatn/fonts/ttf/Vazirmatn-Thin.ttf",
      weight: "100",
      style: "normal",
    },
    {
      path: "../../node_modules/vazirmatn/fonts/ttf/Vazirmatn-ExtraLight.ttf",
      weight: "200",
      style: "normal",
    },
    {
      path: "../../node_modules/vazirmatn/fonts/ttf/Vazirmatn-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../node_modules/vazirmatn/fonts/ttf/Vazirmatn-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../node_modules/vazirmatn/fonts/ttf/Vazirmatn-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../node_modules/vazirmatn/fonts/ttf/Vazirmatn-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../node_modules/vazirmatn/fonts/ttf/Vazirmatn-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../node_modules/vazirmatn/fonts/ttf/Vazirmatn-ExtraBold.ttf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../../node_modules/vazirmatn/fonts/ttf/Vazirmatn-Black.ttf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-vazir",
});

export const metadata: Metadata = {
  title: "Homeino Studio | استودیو طراحی داخلی هومینو",
  description: "طراحی هوشمند فضای داخلی با هوش مصنوعی",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="antialiased font-vazir bg-[#FDFBF7] text-[#1A1A1A]">
        {children}
      </body>
    </html>
  );
}
