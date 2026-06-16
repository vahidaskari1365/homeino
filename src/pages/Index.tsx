import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import CategoriesSection from "@/components/CategoriesSection";
import InspirationSection from "@/components/InspirationSection";
import AIDesignSection from "@/components/AIDesignSection";
import CompleteSetsSection from "@/components/CompleteSetsSection";
import BudgetSection from "@/components/BudgetSection";
import SecondHandSection from "@/components/SecondHandSection";
import ServicesSection from "@/components/ServicesSection";
import SocialProof from "@/components/SocialProof";
import TrustBadges from "@/components/TrustBadges";
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
      <TrustBadges />
      <CategoriesSection />
      <AIDesignSection />
      <InspirationSection />
      <SocialProof />
      <CompleteSetsSection />
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
