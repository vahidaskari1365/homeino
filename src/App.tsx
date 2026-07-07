import { lazy, Suspense } from "react";
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
import Index from "./pages/Index.tsx"; // eager: landing page

const Auth = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Shops = lazy(() => import("./pages/Shops.tsx"));
const ShopDetail = lazy(() => import("./pages/ShopDetail.tsx"));
const ProductDetail = lazy(() => import("./pages/ProductDetail.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const Wishlist = lazy(() => import("./pages/Wishlist.tsx"));
const Compare = lazy(() => import("./pages/Compare.tsx"));
const Quotes = lazy(() => import("./pages/Quotes.tsx"));
const Consultations = lazy(() => import("./pages/Consultations.tsx"));
const SiteVisits = lazy(() => import("./pages/SiteVisits.tsx"));
const Designers = lazy(() => import("./pages/Designers.tsx"));
const SecondHand = lazy(() => import("./pages/SecondHand.tsx"));
const AIDesign = lazy(() => import("./pages/AIDesign.tsx"));
const Inspirations = lazy(() => import("./pages/Inspirations.tsx"));
const InspirationSearch = lazy(() => import("./pages/InspirationSearch.tsx"));
const InspirationDetail = lazy(() => import("./pages/InspirationDetail.tsx"));
const Checkout = lazy(() => import("./pages/Checkout.tsx"));
const BudgetEstimator = lazy(() => import("./pages/BudgetEstimator.tsx"));
const Billing = lazy(() => import("./pages/Billing.tsx"));
const AnalyticsDashboard = lazy(() => import("./pages/AnalyticsDashboard.tsx"));
const StoreHealthPage = lazy(() => import("./pages/StoreHealthPage.tsx"));
const SubscriptionPage = lazy(() => import("./pages/SubscriptionPage.tsx"));
const BadgesPage = lazy(() => import("./pages/BadgesPage.tsx"));
const AddressesPage = lazy(() => import("./pages/AddressesPage.tsx"));
const NotificationPreferencesPage = lazy(() => import("./pages/NotificationPreferencesPage.tsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
  </div>
);

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
                  <Suspense fallback={<PageFallback />}>
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
                      <Route path="/inspiration-search" element={<InspirationSearch />} />
                      <Route path="/inspirations" element={<Inspirations />} />
                      <Route path="/inspirations/:id" element={<InspirationDetail />} />
                      <Route path="/checkout" element={<Checkout />} />
                      <Route path="/budget-estimator" element={<BudgetEstimator />} />
                      <Route path="/billing" element={<Billing />} />
                      <Route path="/analytics" element={<AnalyticsDashboard />} />
                      <Route path="/store-health" element={<StoreHealthPage />} />
                      <Route path="/subscription" element={<SubscriptionPage />} />
                      <Route path="/badges" element={<BadgesPage />} />
                      <Route path="/addresses" element={<AddressesPage />} />
                      <Route path="/notification-preferences" element={<NotificationPreferencesPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
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
