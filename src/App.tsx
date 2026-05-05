import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./components/ThemeProvider";
import { CartProvider } from "./contexts/CartContext";
import { CompareProvider } from "./contexts/CompareContext";
import CartDrawer from "./components/CartDrawer";
import CompareBar from "./components/CompareBar";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Shops from "./pages/Shops.tsx";
import ShopDetail from "./pages/ShopDetail.tsx";
import Admin from "./pages/Admin.tsx";
import Wishlist from "./pages/Wishlist.tsx";
import Compare from "./pages/Compare.tsx";
import Quotes from "./pages/Quotes.tsx";
import Consultations from "./pages/Consultations.tsx";
import SiteVisits from "./pages/SiteVisits.tsx";
import Installers from "./pages/Installers.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
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
                <Route path="/admin" element={<Admin />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/compare" element={<Compare />} />
                <Route path="/quotes" element={<Quotes />} />
                <Route path="/consultations" element={<Consultations />} />
                <Route path="/site-visits" element={<SiteVisits />} />
                <Route path="/installers" element={<Installers />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </CompareProvider>
      </CartProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
