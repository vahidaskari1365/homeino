import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import CategoriesSection from "@/components/CategoriesSection";
import InspirationSection from "@/components/InspirationSection";
import AIDesignSection from "@/components/AIDesignSection";
import CompleteSetsSection from "@/components/CompleteSetsSection";
import BudgetSection from "@/components/BudgetSection";
import SecondHandSection from "@/components/SecondHandSection";
import ServicesSection from "@/components/ServicesSection";
import ChatBot from "@/components/ChatBot";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <CategoriesSection />
      <InspirationSection />
      <AIDesignSection />
      <CompleteSetsSection />
      <BudgetSection />
      <SecondHandSection />
      <ServicesSection />
      <Footer />
      <ChatBot />
    </div>
  );
};

export default Index;
