import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./components/ThemeProvider";
import { CartProvider } from "./contexts/CartContext";
import { CompareProvider } from "./contexts/CompareContext";
import ErrorBoundary from "./components/ErrorBoundary";
import CartDrawer from "./components/CartDrawer";
import CompareBar from "./components/CompareBar";
import { TrackingProvider } from "./contexts/TrackingContext";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Shops from "./pages/Shops.tsx";
import ShopDetail from "./pages/ShopDetail.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import Admin from "./pages/Admin.tsx";
import Wishlist from "./pages/Wishlist.tsx";
import Compare from "./pages/Compare.tsx";
import Quotes from "./pages/Quotes.tsx";
import Consultations from "./pages/Consultations.tsx";
import SiteVisits from "./pages/SiteVisits.tsx";

import Designers from "./pages/Designers.tsx";
import SecondHand from "./pages/SecondHand.tsx";
import AIDesign from "./pages/AIDesign.tsx";
import Inspirations from "./pages/Inspirations.tsx";
import InspirationDetail from "./pages/InspirationDetail.tsx";
import Checkout from "./pages/Checkout.tsx";
import BudgetEstimator from "./pages/BudgetEstimator.tsx";
import Billing from "./pages/Billing.tsx";
import AnalyticsDashboard from "./pages/AnalyticsDashboard.tsx";
import StoreHealthPage from "./pages/StoreHealthPage.tsx";
import SubscriptionPage from "./pages/SubscriptionPage.tsx";
import BadgesPage from "./pages/BadgesPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TrackingProvider>
          <CartProvider>
            <CompareProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <CartDrawer />
                  <CompareBar />
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/shops" element={<Shops />} />
                    <Route path="/shops/:id" element={<ShopDetail />} />
                    <Route path="/product/:id" element={<ProductDetail />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/wishlist" element={<Wishlist />} />
                    <Route path="/compare" element={<Compare />} />
                    <Route path="/quotes" element={<Quotes />} />
                    <Route path="/consultations" element={<Consultations />} />
                    <Route path="/site-visits" element={<SiteVisits />} />
                    
                    <Route path="/designers" element={<Designers />} />
                    <Route path="/second-hand" element={<SecondHand />} />
                    <Route path="/ai-design" element={<AIDesign />} />
                    <Route path="/inspirations" element={<Inspirations />} />
                    <Route path="/inspirations/:id" element={<InspirationDetail />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/budget-estimator" element={<BudgetEstimator />} />
                    <Route path="/billing" element={<Billing />} />
                    <Route path="/analytics" element={<AnalyticsDashboard />} />
                    <Route path="/store-health" element={<StoreHealthPage />} />
                    <Route path="/subscription" element={<SubscriptionPage />} />
                    <Route path="/badges" element={<BadgesPage />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </CompareProvider>
          </CartProvider>
        </TrackingProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;