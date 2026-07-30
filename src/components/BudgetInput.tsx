import { Wallet, PiggyBank, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface BudgetInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  className?: string;
}

const SUGGESTED_BUDGETS = [20000000, 35000000, 50000000, 80000000, 100000000];

function formatPriceDisplay(price: number): string {
  if (price >= 1000000) {
    return (price / 1000000).toLocaleString("fa-IR") + " میلیون";
  }
  return price.toLocaleString("fa-IR");
}

export default function BudgetInput({
  value,
  onChange,
  label = "بودجه مورد نظر خود را وارد کنید",
  className,
}: BudgetInputProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    const num = parseInt(raw, 10);
    onChange(isNaN(num) ? 0 : num);
  };

  const displayValue = value > 0 ? value.toLocaleString("fa-IR") : "";

  return (
    <div className={cn("w-full", className)}>
      {/* Label */}
      <div className="mb-3 flex items-center gap-2">
        <Wallet className="h-5 w-5 text-emerald" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {label}
        </h3>
      </div>

      {/* Input */}
      <div className="relative">
        <Input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleInputChange}
          placeholder="مثلاً ۵۰,۰۰۰,۰۰۰"
          className="h-14 w-full rounded-xl pr-12 text-left text-lg font-bold"
        />
        <PiggyBank className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald" />
      </div>

      {/* Suggested budgets */}
      <div className="mt-3">
        <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">
          پیشنهادهای سریع:
        </p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_BUDGETS.map((budget) => (
            <button
              key={budget}
              onClick={() => onChange(budget)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-bold transition-all",
                value === budget
                  ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-300"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600",
              )}
            >
              <TrendingUp size={12} className="ml-1 inline" />
              {formatPriceDisplay(budget)}
            </button>
          ))}
        </div>
      </div>

      {/* Budget summary when set */}
      {value > 0 && (
        <Card className="mt-4 border-emerald/20 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/10">
          <CardContent className="flex items-center gap-3 p-3">
            <Wallet className="h-8 w-8 flex-shrink-0 text-emerald" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">بودجه تعیین شده</p>
              <p className="text-lg font-bold text-emerald">
                {value.toLocaleString("fa-IR")} تومان
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}