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

const Index = () => {
  return (
    <div className="min-h-screen">
      <SEO />
      <Navbar />
      <HeroSection />
      <CategoriesSection />
      <AIDesignSection />
      <InspirationSection />
      <BudgetSection />
      <SecondHandSection />
      <ServicesSection />
      <Newsletter />
      <Footer />
      <ChatBot />
    </div>
  );
};

export default Index;
