import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Coins, Crown, CheckCircle2, Clock, ArrowRight, History, Wallet } from "lucide-react";
import { useWallet, type TokenPackage, type WalletTransaction } from "@/hooks/useWallet";

// ============================================================
// Homeino — Billing / Token Packages & Transaction History
// ============================================================
// Shows purchasable token packages + full wallet transaction log.
// Payment gateway is NOT implemented — this is architecture-ready.
// ============================================================

const fmt = (n: number) => new Intl.NumberFormat("fa-IR").format(n);
const fmtDate = (d: string) =>
  new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d));

const REASON_LABELS: Record<string, string> = {
  free_design_used: "طراحی رایگان",
  ai_design_used: "مصرف توکن طراحی",
  token_package_purchase: "خرید بسته توکن",
  admin_credit: "اعتبار ادمین",
  admin_debit: "کسری ادمین",
  refund: "بازگشت وجه",
  promotion_bonus: "پاداش تشویقی",
};

const REASON_COLORS: Record<string, string> = {
  free_design_used: "bg-blue-100 text-blue-700 border-blue-200",
  ai_design_used: "bg-amber-100 text-amber-700 border-amber-200",
  token_package_purchase: "bg-emerald-100 text-emerald-700 border-emerald-200",
  admin_credit: "bg-purple-100 text-purple-700 border-purple-200",
  refund: "bg-green-100 text-green-700 border-green-200",
  promotion_bonus: "bg-pink-100 text-pink-700 border-pink-200",
};

const Billing = () => {
  const wallet = useWallet();
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<"packages" | "history">("packages");
  const [loadingPkgs, setLoadingPkgs] = useState(true);

  useEffect(() => {
    wallet.loadPackages().then((pkgs) => {
      setPackages(pkgs);
      setLoadingPkgs(false);
    });
    wallet.loadTransactions(20).then(() => {
      setTransactions(wallet.transactions);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setTransactions(wallet.transactions);
  }, [wallet.transactions]);

  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        {/* ── Header ─────────────────────────────────────── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-4 py-1.5 mb-4">
            <Coins size={14} className="text-gold" />
            <span className="text-gold text-xs font-medium">کیف پول هومینو</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">مدیریت اعتبار و توکن‌ها</h1>
          <p className="text-muted-foreground">
            با خرید توکن، از طراحی هوشمند با جمینی بیشتر استفاده کنید.
          </p>
        </div>

        {/* ── Wallet Summary ─────────────────────────────── */}
        <Card className="mb-8 border-gold/30 bg-gradient-to-br from-gold/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center text-gold">
                  <Wallet size={28} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">موجودی کیف پول</p>
                  <p className="text-3xl font-bold text-gold">
                    {wallet.loading ? (
                      <Skeleton className="h-8 w-24 inline-block" />
                    ) : (
                      <>🪙 {fmt(wallet.balance)}</>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {wallet.freeDesignsRemaining > 0
                      ? `${fmt(wallet.freeDesignsRemaining)} طراحی رایگان باقیمانده`
                      : "طراحی‌های رایگان مصرف شده"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link to="/ai-design">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Crown size={14} /> طراحی با هوش مصنوعی
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Tabs ───────────────────────────────────────── */}
        <div className="flex gap-1 bg-card border border-border rounded-xl p-1 mb-6">
          <button
            onClick={() => setActiveTab("packages")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === "packages"
                ? "bg-gold/15 text-gold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Coins size={16} /> خرید توکن
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === "history"
                ? "bg-gold/15 text-gold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History size={16} /> تاریخچه تراکنش‌ها
          </button>
        </div>

        {/* ── Token Packages ─────────────────────────────── */}
        {activeTab === "packages" && (
          <>
            {loadingPkgs ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="border-border">
                    <CardContent className="p-6">
                      <Skeleton className="h-4 w-16 mb-4" />
                      <Skeleton className="h-8 w-24 mb-2" />
                      <Skeleton className="h-4 w-32 mb-4" />
                      <Skeleton className="h-10 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {packages.map((pkg) => (
                  <Card
                    key={pkg.id}
                    className={`relative border-2 transition-all hover:shadow-lg ${
                      pkg.is_popular
                        ? "border-gold shadow-gold/20"
                        : "border-border hover:border-gold/40"
                    }`}
                  >
                    {pkg.is_popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-gold text-gold-foreground whitespace-nowrap px-3">
                          <Crown size={12} className="ml-1" /> پرطرفدار
                        </Badge>
                      </div>
                    )}
                    <CardContent className="p-6 text-center space-y-4">
                      <div>
                        <p className="text-sm font-bold text-foreground">{pkg.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{pkg.description}</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-gold">{fmt(pkg.total_tokens)}</p>
                        <p className="text-xs text-muted-foreground">توکن</p>
                      </div>
                      {pkg.bonus_tokens > 0 && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                          <p className="text-xs text-emerald-700 font-medium">
                            {fmt(pkg.bonus_tokens)} توکن هدیه 🎁
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-lg font-bold">{fmt(pkg.price_rial)}</p>
                        <p className="text-xs text-muted-foreground">ریال</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground bg-muted rounded-lg px-2 py-1">
                        به‌زودی با درگاه پرداخت فعال می‌شود
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Placeholder notice */}
            <Card className="mt-6 border-amber-200 bg-amber-50">
              <CardContent className="p-4 flex items-center gap-3">
                <Clock size={18} className="text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800">
                  درگاه پرداخت هومینو به‌زودی راه‌اندازی می‌شود. در حال حاضرسیستم توکن به صورت نمایشی فعال است.
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {/* ── Transaction History ────────────────────────── */}
        {activeTab === "history" && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History size={18} className="text-gold" />
                تاریخچه تراکنش‌های کیف پول
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Wallet size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">هنوز تراکنشی ثبت نشده است.</p>
                  <p className="text-xs mt-1">با طراحی هوشمند یا خرید توکن، اولین تراکنش ثبت می‌شود.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-card border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ${
                          tx.credit > 0
                            ? "bg-emerald-100 text-emerald-700"
                            : tx.debit > 0
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {tx.credit > 0 ? "+" : tx.debit > 0 ? "-" : "•"}
                        </div>
                        <div>
                          <Badge
                            variant="outline"
                            className={`text-xs ${REASON_COLORS[tx.reason] || "bg-gray-100 text-gray-700"}`}
                          >
                            {REASON_LABELS[tx.reason] || tx.reason}
                          </Badge>
                          {tx.description && (
                            <p className="text-xs text-muted-foreground mt-1">{tx.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-left">
                        <p className={`text-sm font-bold ${
                          tx.credit > 0 ? "text-emerald-600" : tx.debit > 0 ? "text-amber-600" : "text-blue-600"
                        }`}>
                          {tx.credit > 0 ? `+${fmt(tx.credit)}` : tx.debit > 0 ? `-${fmt(tx.debit)}` : "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          موجودی: {fmt(tx.balance_after)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {fmtDate(tx.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => wallet.loadTransactions(50)}
                  className="gap-2"
                >
                  <History size={14} /> بارگذاری بیشتر
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Back link ──────────────────────────────────── */}
        <div className="mt-8 text-center">
          <Link to="/dashboard">
            <Button variant="outline" className="gap-2">
              <ArrowRight size={16} /> بازگشت به داشبورد
            </Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Billing;