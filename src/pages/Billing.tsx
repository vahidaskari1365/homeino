import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Crown, ArrowRight, Clock } from "lucide-react";

// ============================================================
// Homeino — Billing / Increase Balance (PLACEHOLDER)
// ============================================================
// Reached from the "+ افزایش موجودی" (Increase Balance) button in the
// Customer Dashboard header/token widget, and from the Premium tab's plan
// cards. Intentionally NOT wired to any payment gateway yet — the token
// (`consume_design_credit` / `credit_tokens`) and subscription
// (`subscription_plans` / `store_subscriptions`) architecture already
// exists in the database and is ready for a real gateway to plug into
// later. This page only communicates that to the user.
// ============================================================

const Billing = () => {
  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-16 max-w-lg">
        <Card className="border-gold/30">
          <CardContent className="p-8 text-center space-y-5">
            <div className="mx-auto h-16 w-16 rounded-full bg-gold/10 flex items-center justify-center text-gold">
              <Coins size={32} />
            </div>
            <h1 className="text-xl font-bold">افزایش موجودی و ارتقا به پرمیوم</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              درگاه پرداخت هومینو به‌زودی راه‌اندازی می‌شود. پس از فعال‌سازی، از همین صفحه می‌توانید
              توکن طراحی هوشمند خریداری کرده یا اشتراک فروشگاهی خود را ارتقا دهید.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <Clock size={14} /> این بخش در حال حاضر فقط جنبه نمایشی دارد.
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Crown size={14} className="text-gold" /> پلن‌های Starter، Business، Professional و Enterprise به‌زودی فعال می‌شوند.
            </div>
            <Link to="/dashboard">
              <Button variant="outline" className="gap-2 mt-2">
                <ArrowRight size={16} /> بازگشت به داشبورد
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Billing;
