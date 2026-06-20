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

const Index = () => {
  return (
    <div className="min-h-screen">
      <SEO />
      <ScrollProgress />
      <Navbar />
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
