import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import CategoriesSection from "@/components/CategoriesSection";
import InspirationSection from "@/components/InspirationSection";
import AIDesignSection from "@/components/AIDesignSection";
import BudgetSection from "@/components/BudgetSection";
import SecondHandSection from "@/components/SecondHandSection";
import ServicesSection from "@/components/ServicesSection";
import Newsletter from "@/components/Newsletter";
import ChatBot from "@/components/ChatBot";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import ScrollProgress from "@/components/ScrollProgress";
import Reveal from "@/components/Reveal";

// Premium cinematic real background images from existing project assets
import sceneLiving from "@/assets/hero-cinematic-living.jpg";
import sceneBedroom from "@/assets/hero-cinematic-bedroom.jpg";
import sceneKitchen from "@/assets/hero-cinematic-kitchen.jpg";
import imgLiving from "@/assets/board/b-living.jpg";
import imgBedroom from "@/assets/board/b-bedroom.jpg";
import imgKitchen from "@/assets/board/b-kitchen.jpg";

const BACKGROUNDS = [
  { id: "hero", src: sceneLiving },
  { id: "categories", src: imgLiving },
  { id: "ai-design", src: sceneKitchen },
  { id: "inspiration", src: sceneBedroom },
  { id: "budget", src: imgBedroom },
  { id: "secondhand", src: imgKitchen },
];

const Index = () => {
  const [activeBg, setActiveBg] = useState("hero");

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;

      // Detect which section is currently centered/active in viewport
      const sections = [
        { id: "hero", top: 0, bottom: windowHeight },
        { id: "categories", el: document.getElementById("categories") },
        { id: "ai-design", el: document.getElementById("ai-design") },
        { id: "inspiration", el: document.getElementById("inspiration") },
        { id: "budget", el: document.getElementById("budget") },
        { id: "secondhand", el: document.getElementById("secondhand") },
      ];

      for (const section of sections) {
        if (section.id === "hero") {
          if (scrollY < windowHeight * 0.8) {
            setActiveBg("hero");
            break;
          }
        } else if (section.el) {
          const rect = section.el.getBoundingClientRect();
          const elemCenter = rect.top + rect.height / 2;
          if (elemCenter >= 0 && elemCenter <= windowHeight * 1.5) {
            setActiveBg(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen relative text-foreground">
      <SEO />
      <ScrollProgress />
      <Navbar />

      {/* Real Cinematic Parallax Scroll-linked Background Manager */}
      <div className="immersive-scrolling-bg">
        {BACKGROUNDS.map((bg) => (
          <div
            key={bg.id}
            className={`immersive-bg-layer ${activeBg === bg.id ? "opacity-[0.25] scale-100" : "opacity-0 scale-[1.03]"}`}
          >
            <img src={bg.src} alt="Cinematic Interior Design" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-b from-charcoal/80 via-transparent to-charcoal/85" />
          </div>
        ))}
      </div>

      <HeroSection />

      <Reveal variant="up" delay={0}>
        <CategoriesSection />
      </Reveal>

      <Reveal variant="scale" delay={80}>
        <AIDesignSection />
      </Reveal>

      <Reveal variant="up" delay={0}>
        <InspirationSection />
      </Reveal>

      <Reveal variant="up" delay={80}>
        <BudgetSection />
      </Reveal>

      <Reveal variant="up" delay={0}>
        <SecondHandSection />
      </Reveal>

      <Reveal variant="up" delay={80}>
        <ServicesSection />
      </Reveal>

      <Reveal variant="fade" delay={0}>
        <Newsletter />
      </Reveal>

      <Footer />
      <ChatBot />
    </div>
  );
};

export default Index;
