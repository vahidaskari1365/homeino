import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import CategoriesSection from "@/components/CategoriesSection";
import InspirationSection from "@/components/InspirationSection";
import BudgetSection from "@/components/BudgetSection";
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
  { id: "hero", src: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=2000&q=80" }, // Stunning Villa Exterior
  { id: "categories", src: sceneLiving }, // Enters into living room
  { id: "ai-design", src: imgLiving }, // Sitting on sofa
  { id: "inspiration", src: sceneBedroom }, // Cozy Bedroom
  { id: "budget", src: imgBedroom }, // Study Room
];

const Index = () => {
  const [activeBg, setActiveBg] = useState("hero");

  // Preload all cinematic images in background for 0ms transition latency
  useEffect(() => {
    BACKGROUNDS.forEach((bg) => {
      const img = new Image();
      img.src = bg.src;
    });
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;

      // Safe checks
      const categoriesEl = document.getElementById("categories");
      const aiDesignEl = document.getElementById("ai-design");
      const inspirationEl = document.getElementById("inspiration");
      const budgetEl = document.getElementById("budget");

      if (scrollY < windowHeight * 0.6) {
        setActiveBg("hero");
        return;
      }

      // Check current active section with a balanced viewport mid-point threshold
      const midPoint = scrollY + windowHeight / 2;

      if (budgetEl && midPoint >= budgetEl.offsetTop) {
        setActiveBg("budget");
      } else if (inspirationEl && midPoint >= inspirationEl.offsetTop) {
        setActiveBg("inspiration");
      } else if (aiDesignEl && midPoint >= aiDesignEl.offsetTop) {
        setActiveBg("ai-design");
      } else if (categoriesEl && midPoint >= categoriesEl.offsetTop) {
        setActiveBg("categories");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Compute 3D transition state styles for each background layer
  const getBgStyle = (id: string) => {
    const currentIndex = BACKGROUNDS.findIndex((bg) => bg.id === activeBg);
    const thisIndex = BACKGROUNDS.findIndex((bg) => bg.id === id);

    if (thisIndex === currentIndex) {
      return {
        opacity: 0.82,
        transform: "scale(1.0) translate3d(0, 0, 0) rotateX(0deg)",
        filter: "blur(0px) brightness(1.02) contrast(1.02)",
      };
    } else if (thisIndex < currentIndex) {
      // Scrolled past -> zoom in and float up slightly with 3D perspective
      return {
        opacity: 0,
        transform: "scale(1.14) translate3d(0, -6%, 50px) rotateX(6deg)",
        filter: "blur(4px) brightness(0.9)",
      };
    } else {
      // Upcoming -> start smaller with downward 3D tilt
      return {
        opacity: 0,
        transform: "scale(0.86) translate3d(0, 6%, -50px) rotateX(-6deg)",
        filter: "blur(4px) brightness(0.95)",
      };
    }
  };

  return (
    <div className="min-h-screen relative text-foreground overflow-x-hidden">
      <SEO />
      <ScrollProgress />
      <Navbar />

      {/* Real Cinematic 3D Parallax Scroll-linked Camera-Travel Background Manager */}
      <div className="fixed inset-0 z-[-10] pointer-events-none bg-[#faf8f6]">
        {BACKGROUNDS.map((bg) => (
          <div
            key={bg.id}
            className="absolute inset-0 transition-all ease-out will-change-transform-opacity"
            style={{ transitionDuration: '1300ms', ...getBgStyle(bg.id) }}
          >
            <img src={bg.src} alt="Cinematic Interior Design Journey" className="w-full h-full object-cover" />
            {/* Elegant luxury cream-to-transparent overlay wash */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#faf8f6]/35 via-transparent to-[#faf8f6]/55" />
          </div>
        ))}
      </div>

      <HeroSection />

      <Reveal variant="up" delay={0}>
        <CategoriesSection />
      </Reveal>


      <Reveal variant="up" delay={0}>
        <InspirationSection />
      </Reveal>

      <Reveal variant="up" delay={80}>
        <BudgetSection />
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
